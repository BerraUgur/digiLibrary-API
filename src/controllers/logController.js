const { getLogs, getLogStats, deleteOldLogs } = require('../services/logService');

// Get all logs with filters
const getAllLogs = async (req, res) => {
  try {
    const {
      level,
      operation,
      userId,
      startDate,
      endDate,
      ip,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filters = {
      level,
      operation,
      userId,
      startDate,
      endDate,
      ip,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await getLogs(filters);

    res.status(200).json({
      success: true,
      message: 'Logs retrieved successfully',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve logs',
      error: error.message,
    });
  }
};

// Get log statistics
const getStats = async (req, res) => {
  try {
    const stats = await getLogStats();

    res.status(200).json({
      success: true,
      message: 'Log statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve log statistics',
      error: error.message,
    });
  }
};

// Delete old logs (admin only)
const cleanupOldLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const result = await deleteOldLogs(parseInt(days));

    res.status(200).json({
      success: true,
      message: `Successfully deleted logs older than ${days} days`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error('Cleanup logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old logs',
      error: error.message,
    });
  }
};

module.exports = {
  getAllLogs,
  getStats,
  cleanupOldLogs,
};
