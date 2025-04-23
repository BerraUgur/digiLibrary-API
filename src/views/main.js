let accessToken = '';
let userRole = '';

// Giriş
const loginBtn = document.getElementById('loginBtn');
loginBtn.addEventListener('click', login);

// Çıkış yap fonksiyonu
function logout() {
  userRole = '';
  accessToken = '';
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('adminSection').classList.add('hidden');
  document.getElementById('userSection').classList.add('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginResult').innerHTML = '';
}

// Giriş başarılıysa çıkış butonunu göster
function showLogoutButton(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel.querySelector('.logout-btn')) {
    const btn = document.createElement('button');
    btn.textContent = 'Çıkış Yap';
    btn.className = 'logout-btn';
    btn.onclick = logout;
    panel.insertBefore(btn, panel.firstChild);
  }
}

function showAdminPanel() {
  document.getElementById('adminSection').classList.remove('hidden');
  showLogoutButton('adminSection');
  listBooksAdmin();
  listUsers();
}

window.addEventListener('DOMContentLoaded', () => {
  if (userRole === 'admin') {
    showAdminPanel();
  }
});

function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.user && data.user._id) {
      userRole = data.user.role;
      accessToken = data.accessToken || '';
      document.getElementById('loginResult').innerHTML = 'Giriş başarılı!';
      document.getElementById('loginSection').classList.add('hidden');
      if (userRole === 'admin') {
        showAdminPanel();
      } else {
        document.getElementById('userSection').classList.remove('hidden');
        showLogoutButton('userSection');
        listBooksUser();
      }
    } else {
      document.getElementById('loginResult').innerHTML = '<span class="error">' + (data.message || 'Giriş başarısız!') + '</span>';
    }
  });
}

// Admin işlemleri
function listBooksAdmin() {
  fetch('/api/books')
    .then(res => res.json())
    .then(books => {
      let html = '<h4>Kitaplar</h4><table class="list-table"><tr><th>ID</th><th>Başlık</th><th>Yazar</th><th>Kategori</th><th>Durum</th><th>İşlem</th></tr>';
      books.forEach(b => {
        html += `<tr id="row_${b._id}"><td>${b._id}</td><td><span id="title_${b._id}">${b.title}</span></td><td><span id="author_${b._id}">${b.author}</span></td><td><span id="category_${b._id}">${b.category}</span></td><td>${b.available ? 'Mevcut' : 'Yok'}</td><td><button onclick="editBookRow('${b._id}')">Düzenle</button> <button onclick="deleteBookRow('${b._id}')">Sil</button></td></tr>`;
      });
      html += '</table>';
      document.getElementById('adminBooksTable').innerHTML = html;
    });
}

window.editBookRow = function(id) {
  const row = document.getElementById('row_' + id);
  const title = document.getElementById('title_' + id).innerText;
  const author = document.getElementById('author_' + id).innerText;
  const category = document.getElementById('category_' + id).innerText;
  row.innerHTML = `<td>${id}</td><td><input value="${title}" id="editTitle${id}"/></td><td><input value="${author}" id="editAuthor${id}"/></td><td><input value="${category}" id="editCategory${id}"/></td><td></td><td><button onclick="saveBookRow('${id}')">Kaydet</button> <button onclick="listBooksAdmin()">Vazgeç</button></td>`;
};

window.saveBookRow = function(id) {
  const title = document.getElementById('editTitle'+id).value;
  const author = document.getElementById('editAuthor'+id).value;
  const category = document.getElementById('editCategory'+id).value;
  fetch('/api/books/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    body: JSON.stringify({ title, author, category })
  })
    .then(res => res.json())
    .then(data => {
      listBooksAdmin();
    });
};

function listUsers() {
  fetch('/api/users', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  })
    .then(res => res.json())
    .then(users => {
      let html = '<h4>Kullanıcılar</h4><table class="list-table"><tr><th>ID</th><th>Kullanıcı Adı</th><th>Email</th><th>Rol</th><th>İşlem</th></tr>';
      users.forEach(u => {
        html += `<tr><td>${u._id}</td><td>${u.username}</td><td>${u.email}</td><td>${u.role}</td><td><button onclick="deleteUserRow('${u._id}')">Sil</button></td></tr>`;
      });
      html += '</table>';
      document.getElementById('adminUsersTable').innerHTML = html;
    });
}

window.deleteBookRow = function(id) {
  if(confirm('Kitabı silmek istediğinize emin misiniz?')) {
    fetch('/api/books/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + accessToken }
    })
      .then(res => res.json())
      .then(data => {
        listBooksAdmin();
      });
  }
};

window.deleteUserRow = function(id) {
  if(confirm('Kullanıcıyı silmek istediğinize emin misiniz?')) {
    fetch('/api/users/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + accessToken }
    })
      .then(res => res.json())
      .then(data => {
        listUsers();
      });
  }
};

// Kullanıcı işlemleri
function listBooksUser() {
  fetch('/api/books')
    .then(res => res.json())
    .then(books => {
      let html = '<table class="list-table"><tr><th>ID</th><th>Başlık</th><th>Yazar</th><th>Kategori</th><th>Durum</th></tr>';
      books.forEach(b => {
        html += `<tr><td>${b._id}</td><td>${b.title}</td><td>${b.author}</td><td>${b.category}</td><td>${b.available ? 'Mevcut' : 'Yok'}</td></tr>`;
      });
      html += '</table>';
      document.getElementById('userListResult').innerHTML = html;
    });
  listMyBooks();
}

function listMyBooks() {
  fetch('/api/books/my', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  })
    .then(res => res.json())
    .then(books => {
      let html = '<button onclick="showAddBookForm()">Yeni Kitap Ekle</button>';
      html += '<table class="list-table"><tr><th>ID</th><th>Başlık</th><th>Yazar</th><th>Kategori</th><th>İşlem</th></tr>';
      books.forEach(b => {
        html += `<tr id="myrow_${b._id}"><td>${b._id}</td><td><span id="mytitle_${b._id}">${b.title}</span></td><td><span id="myauthor_${b._id}">${b.author}</span></td><td><span id="mycategory_${b._id}">${b.category}</span></td><td><button onclick="editMyBookRow('${b._id}')">Düzenle</button> <button onclick="deleteMyBookRow('${b._id}')">Sil</button></td></tr>`;
      });
      html += '</table>';
      html += '<div id="addBookForm" style="display:none;"></div>';
      document.getElementById('myBooksResult').innerHTML = html;
    });
}

window.showAddBookForm = function() {
  document.getElementById('addBookForm').style.display = 'block';
  document.getElementById('addBookForm').innerHTML = `
    <h4>Yeni Kitap Ekle</h4>
    <label>Başlık: <input id='newBookTitle'></label>
    <label>Yazar: <input id='newBookAuthor'></label>
    <label>Kategori: <input id='newBookCategory'></label>
    <button onclick='addMyBook()'>Ekle</button>
    <button onclick="hideAddBookForm()">Vazgeç</button>
    <div id='addBookResult'></div>
  `;
};
window.hideAddBookForm = function() {
  document.getElementById('addBookForm').style.display = 'none';
};
window.addMyBook = function() {
  const title = document.getElementById('newBookTitle').value;
  const author = document.getElementById('newBookAuthor').value;
  const category = document.getElementById('newBookCategory').value;
  fetch('/api/books', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    body: JSON.stringify({ title, author, category })
  })
    .then(res => res.json())
    .then(data => {
      if (data._id) {
        document.getElementById('addBookResult').innerHTML = 'Kitap eklendi!';
        listMyBooks();
        hideAddBookForm();
      } else {
        document.getElementById('addBookResult').innerHTML = '<span class="error">' + (data.message || 'Ekleme başarısız!') + '</span>';
      }
    });
};
window.editMyBookRow = function(id) {
  const row = document.getElementById('myrow_' + id);
  const title = document.getElementById('mytitle_' + id).innerText;
  const author = document.getElementById('myauthor_' + id).innerText;
  const category = document.getElementById('mycategory_' + id).innerText;
  row.innerHTML = `<td>${id}</td><td><input value="${title}" id="editMyTitle${id}"/></td><td><input value="${author}" id="editMyAuthor${id}"/></td><td><input value="${category}" id="editMyCategory${id}"/></td><td><button onclick="saveMyBookRow('${id}')">Kaydet</button> <button onclick="listMyBooks()">Vazgeç</button></td>`;
};
window.saveMyBookRow = function(id) {
  const title = document.getElementById('editMyTitle'+id).value;
  const author = document.getElementById('editMyAuthor'+id).value;
  const category = document.getElementById('editMyCategory'+id).value;
  fetch('/api/books/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    body: JSON.stringify({ title, author, category })
  })
    .then(res => res.json())
    .then(data => {
      listMyBooks();
    });
};
window.deleteMyBookRow = function(id) {
  if(confirm('Kitabı silmek istediğinize emin misiniz?')) {
    fetch('/api/books/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + accessToken }
    })
      .then(res => res.json())
      .then(data => {
        listMyBooks();
      });
  }
};

// QR kod için yardımcı fonksiyon
function showQrCode(elementId, text) {
  document.getElementById(elementId).innerHTML = '';
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
  document.getElementById(elementId).appendChild(img);
}

function borrowBook() {
  const bookId = document.getElementById('loanBookId').value;
  const dueDate = document.getElementById('dueDate').value;
  fetch('/api/loans/borrow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    body: JSON.stringify({ bookId, dueDate })
  })
  .then(res => res.json())
  .then(data => {
    if (data._id) {
      document.getElementById('loanResult').innerHTML = 'Kitap ödünç alındı!';
      showQrCode('borrowQrCode', `LoanID: ${data._id}`);
      listBooksUser();
    } else {
      document.getElementById('loanResult').innerHTML = '<span class="error">' + (data.message || 'İşlem başarısız!') + '</span>';
      document.getElementById('borrowQrCode').innerHTML = '';
    }
  });
}
function returnBook() {
  const loanId = document.getElementById('returnLoanId').value;
  fetch('/api/loans/return/' + loanId, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + accessToken }
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById('returnResult').innerHTML = data.message || 'İade edildi!';
      showQrCode('returnQrCode', `Return LoanID: ${loanId}`);
      listBooksUser();
    });
}
function addFavorite() {
  const bookId = document.getElementById('favBookId').value;
  fetch('/api/users/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    body: JSON.stringify({ bookId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.favorite) {
      document.getElementById('favResult').innerHTML = 'Kitap favorilere eklendi!';
    } else {
      document.getElementById('favResult').innerHTML = '<span class="error">' + (data.message || 'İşlem başarısız!') + '</span>';
    }
  });
}
