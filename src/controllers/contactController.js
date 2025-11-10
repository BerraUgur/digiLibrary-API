const { sendEmail } = require('../services/mailService');
const { logErrorDetails } = require('../middleware/logEvents');
const Contact = require('../models/Contact');
const CONTACT_INFO = require('../constants/contactConstants');

const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    // Message length validation
    if (message.length < 10) {
      return res.status(400).json({ message: 'Message must be at least 10 characters long.' });
    }

    try {
      // Prepare email content for admin notification
      const emailSubject = `Contact Form: ${subject}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">New Contact Form Message</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="background: white; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h3 style="margin-top: 0;">Message:</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This message was sent via the DigiLibrary contact form.
          </p>
        </div>
      `;

      // Send email to admin
      await sendEmail('info@dijitalkutuphane.com', emailSubject, emailBody);

      // Send confirmation email to user
      const confirmationSubject = 'Message Received - DigiLibrary';
      const confirmationBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Hello ${name},</h2>
          <p>Your message has been successfully received. We will get back to you as soon as possible.</p>
          <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your message:</h3>
            <p><strong>Subject:</strong> ${subject}</p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <p>Happy reading!</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            <strong>DigiLibrary Team</strong><br>
            ${CONTACT_INFO.EMAIL} | ${CONTACT_INFO.PHONE}
          </p>
        </div>
      `;
      
      await sendEmail(email, confirmationSubject, confirmationBody);

    } catch (emailError) {
      // Email service failure should not prevent message from being saved to database
      await logErrorDetails('Contact Email Sending Failed', emailError, req, {
        recipientEmail: email,
        adminEmail: CONTACT_INFO.EMAIL
      });
    }

    const contactMessage = new Contact({
      name,
      email,
      subject,
      message,
      userId: req.user?._id || null,
      status: 'new'
    });

    await contactMessage.save();

    res.status(200).json({ 
      message: 'Your message has been sent successfully. We will get back to you shortly.',
      success: true
    });

  } catch (error) {
    await logErrorDetails('Send Contact Message Failed', error, req, {
      name: req.body?.name || 'N/A',
      email: req.body?.email || 'N/A',
      subject: req.body?.subject || 'N/A'
    });
    res.status(500).json({ 
      message: 'An error occurred while sending your message. Please try again later.',
      success: false
    });
  }
};

const getAllMessages = async (req, res) => {
  try {
    const { page = 1, status } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && ['new', 'read'].includes(status)) {
      filter.status = status;
    }

    const allMessages = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    const conversationMap = new Map();
    
    allMessages.forEach(msg => {
      if (!conversationMap.has(msg.email)) {
        conversationMap.set(msg.email, {
          email: msg.email,
          name: msg.name,
          userId: msg.userId,
          messages: [],
          latestDate: msg.createdAt,
          hasUnread: msg.status === 'new'
        });
      }
      
      const conversation = conversationMap.get(msg.email);
      conversation.messages.push(msg);
      
      // Update latest date
      if (new Date(msg.createdAt) > new Date(conversation.latestDate)) {
        conversation.latestDate = msg.createdAt;
      }
      
      // Check if any message is unread
      if (msg.status === 'new') {
        conversation.hasUnread = true;
      }
    });

    // Convert map to array and sort by latest message date
    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));

    // Apply pagination to conversations
    const paginatedConversations = conversations.slice(skip, skip + limit);
    const total = conversations.length;

    res.status(200).json({
      items: paginatedConversations,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    await logErrorDetails('Get All Messages Failed', error, req, {
      page: req.query?.page || '1',
      status: req.query?.status || 'all'
    });
    res.status(500).json({ 
      message: 'An error occurred while retrieving messages.',
      success: false
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Contact.findByIdAndUpdate(
      id,
      { status: 'read' },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    res.status(200).json({ 
      message: 'Message marked as read.',
      success: true,
      data: message
    });

  } catch (error) {
    await logErrorDetails('Mark Message As Read Failed', error, req, {
      messageId: req.params?.id || 'N/A'
    });
    res.status(500).json({ 
      message: 'An error occurred while updating the message.',
      success: false
    });
  }
};

const replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    if (!replyMessage || replyMessage.trim().length < 10) {
      return res.status(400).json({ message: 'Reply message must be at least 10 characters long.' });
    }

    const message = await Contact.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    message.reply = {
      message: replyMessage,
      repliedAt: new Date(),
      repliedBy: req.user._id
    };
    message.status = 'read';
    await message.save();

    try {
      const { sendEmail } = require('../services/mailService');
      const emailSubject = `Reply to Your Message - ${message.subject}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Hello ${message.name},</h2>
          <p>We have replied to your message about "${message.subject}".</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #666;">Your Message:</h3>
            <p style="white-space: pre-wrap;">${message.message}</p>
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">Our Reply:</h3>
            <p style="white-space: pre-wrap;">${replyMessage}</p>
          </div>
          
          <p>Happy reading!</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            <strong>DigiLibrary Team</strong><br>
            ${CONTACT_INFO.EMAIL} | ${CONTACT_INFO.PHONE}
          </p>
        </div>
      `;
      
      await sendEmail(message.email, emailSubject, emailBody);
    } catch (emailError) {
      // Reply email failure should not prevent reply from being saved to database
      await logErrorDetails('Reply Email Sending Failed', emailError, req, {
        recipientEmail: message.email,
        messageId: id
      });
    }

    res.status(200).json({ 
      message: 'Reply sent successfully.',
      success: true,
      data: message
    });

  } catch (error) {
    await logErrorDetails('Reply To Message Failed', error, req, {
      messageId: req.params?.id || 'N/A',
      replyLength: req.body?.replyMessage?.length || 0
    });
    res.status(500).json({ 
      message: 'An error occurred while sending the reply.',
      success: false
    });
  }
};

const sendNewMessageToUser = async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ message: 'Email, subject, and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (message.length < 10) {
      return res.status(400).json({ message: 'Message must be at least 10 characters long.' });
    }

    if (subject.length < 3) {
      return res.status(400).json({ message: 'Subject must be at least 3 characters long.' });
    }

    const existingMessage = await Contact.findOne({ email }).lean();
    const userName = existingMessage ? existingMessage.name : 'User';

    try {
      const emailSubject = `DigiLibrary - ${subject}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Message from DigiLibrary</h2>
          <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">${subject}</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          <p>Happy reading!</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            <strong>DigiLibrary Team</strong><br>
            ${CONTACT_INFO.EMAIL} | ${CONTACT_INFO.PHONE}
          </p>
        </div>
      `;

      await sendEmail(email, emailSubject, emailBody);

    } catch (emailError) {
      await logErrorDetails('Admin Message Email Sending Failed', emailError, req, {
        targetEmail: req.body?.email || 'N/A',
        subject: req.body?.subject || 'N/A'
      });
      return res.status(500).json({ 
        message: 'An error occurred while sending email.',
        success: false
      });
    }

    const adminMessage = new Contact({
      name: userName,
      email: email,
      subject: subject,
      message: `[This message was sent by admin]`,
      status: 'read',
      reply: {
        message: message,
        repliedAt: new Date(),
        repliedBy: req.user._id
      }
    });

    await adminMessage.save();

    res.status(200).json({
      message: 'Message sent successfully and added to conversation history.',
      success: true
    });

  } catch (error) {
    await logErrorDetails('Send New Message To User Failed', error, req, {
      targetEmail: req.body?.email || 'N/A',
      subject: req.body?.subject || 'N/A'
    });
    res.status(500).json({ 
      message: 'An error occurred while sending the message.',
      success: false
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Contact.countDocuments({ status: 'new' });

    res.status(200).json({
      count: unreadCount,
      success: true
    });

  } catch (error) {
    await logErrorDetails('Get Unread Count Failed', error, req, {});
    res.status(500).json({ 
      message: 'Failed to get unread message count.',
      success: false,
      count: 0
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Contact.findByIdAndDelete(id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    res.status(200).json({ 
      message: 'Message successfully deleted.',
      success: true
    });

  } catch (error) {
    await logErrorDetails('Delete Message Failed', error, req, {
      messageId: req.params?.id || 'N/A'
    });
    res.status(500).json({ 
      message: 'An error occurred while deleting the message.',
      success: false
    });
  }
};

module.exports = {
  sendContactMessage,
  getAllMessages,
  markAsRead,
  replyToMessage,
  sendNewMessageToUser,
  getUnreadCount,
  deleteMessage
};
