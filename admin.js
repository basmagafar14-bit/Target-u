// تحميل لوحة المدير
async function loadAdminPanel() {
    if (!isAdmin) return;
    
    await loadUsersList();
    await loadRoomsList();
    await loadCodesList();
}

// تبديل تبويبات المدير
function showAdminTab(tab) {
    document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(`${tab}Tab`).classList.remove('hidden');
    event.target.classList.add('active');
}

// تحميل قائمة المستخدمين
async function loadUsersList() {
    const users = await telegramDB.getData('users') || [];
    const container = document.getElementById('usersList');
    
    container.innerHTML = users.map(user => `
        <div class="admin-item">
            <div class="admin-item-info">
                <img src="${user.photo}" alt="${user.name}" style="width: 40px; height: 40px; border-radius: 50%;">
                <div>
                    <strong>${user.name}</strong>
                    <p>📱 ${user.phone}</p>
                    <p>${user.isVip ? '✨ مميز' : 'عادي'}</p>
                    <p>تاريخ التسجيل: ${formatDate(user.createdAt)}</p>
                </div>
            </div>
            <div class="admin-actions">
                ${!user.isAdmin ? `
                    <button onclick="banUser('${user.id}')" class="btn-warning">
                        <i class="fas fa-ban"></i> حظر
                    </button>
                    <button onclick="deleteUser('${user.id}')" class="btn-danger">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// حظر مستخدم
async function banUser(userId) {
    if (!confirm('هل أنت متأكد من حظر هذا المستخدم؟')) return;
    
    const users = await telegramDB.getData('users') || [];
    const bannedUsers = await telegramDB.getData('bannedUsers') || [];
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        bannedUsers.push(users[userIndex]);
        users.splice(userIndex, 1);
        
        await telegramDB.saveData('users', users);
        await telegramDB.saveData('bannedUsers', bannedUsers);
        
        loadUsersList();
        alert('تم حظر المستخدم بنجاح');
    }
}

// حذف مستخدم
async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
    
    const users = await telegramDB.getData('users') || [];
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        users.splice(userIndex, 1);
        await telegramDB.saveData('users', users);
        loadUsersList();
        alert('تم حذف المستخدم بنجاح');
    }
}

// تحميل قائمة الغرف
async function loadRoomsList() {
    const rooms = await telegramDB.getData('chatRooms') || [];
    const container = document.getElementById('adminRoomsList');
    
    container.innerHTML = rooms.map(room => `
        <div class="admin-item">
            <div class="admin-item-info">
                <strong>${room.name}</strong>
                <p>ID: ${room.id}</p>
                <p>تاريخ الإنشاء: ${formatDate(room.createdAt)}</p>
            </div>
            <div class="admin-actions">
                <button onclick="editRoomCode('${room.id}')" class="btn-warning">
                    <i class="fas fa-edit"></i> تعديل الرمز
                </button>
                <button onclick="deleteRoom('${room.id}')" class="btn-danger">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `).join('');
}

// تعديل رمز الغرفة
async function editRoomCode(roomId) {
    const newCode = prompt('أدخل الرمز الجديد للغرفة:');
    if (!newCode) return;
    
    const rooms = await telegramDB.getData('chatRooms') || [];
    const roomIndex = rooms.findIndex(r => r.id === roomId);
    
    if (roomIndex !== -1) {
        rooms[roomIndex].id = newCode;
        await telegramDB.saveData('chatRooms', rooms);
        loadRoomsList();
        alert('تم تعديل رمز الغرفة بنجاح');
    }
}

// حذف غرفة
async function deleteRoom(roomId) {
    if (!confirm('هل أنت متأكد من حذف هذه الغرفة؟')) return;
    
    const rooms = await telegramDB.getData('chatRooms') || [];
    const roomIndex = rooms.findIndex(r => r.id === roomId);
    
    if (roomIndex !== -1) {
        rooms.splice(roomIndex, 1);
        await telegramDB.saveData('chatRooms', rooms);
        
        // حذف رسائل الغرفة
        await telegramDB.saveData(`messages_${roomId}`, []);
        
        loadRoomsList();
        alert('تم حذف الغرفة بنجاح');
    }
}

// تحميل قائمة الرموز
async function loadCodesList() {
    const vipCodes = await telegramDB.getData('vipCodes') || CONFIG.vipCodes;
    const container = document.getElementById('codesList');
    
    container.innerHTML = vipCodes.map((code, index) => `
        <div class="admin-item">
            <span>${code}</span>
            <div class="admin-actions">
                <button onclick="deleteVipCode(${index}, '${code}')" class="btn-danger">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `).join('');
}

// إضافة رمز مميز جديد
async function addVipCode() {
    const newCode = document.getElementById('newVipCode').value.trim();
    if (!newCode) {
        alert('يرجى إدخال رمز');
        return;
    }
    
    const vipCodes = await telegramDB.getData('vipCodes') || CONFIG.vipCodes;
    
    if (vipCodes.includes(newCode)) {
        alert('هذا الرمز موجود بالفعل');
        return;
    }
    
    vipCodes.push(newCode);
    await telegramDB.saveData('vipCodes', vipCodes);
    CONFIG.vipCodes = vipCodes;
    
    document.getElementById('newVipCode').value = '';
    loadCodesList();
    alert('تم إضافة الرمز بنجاح');
}

// حذف رمز مميز
async function deleteVipCode(index, code) {
    if (!confirm(`هل أنت متأكد من حذف الرمز: ${code}؟`)) return;
    
    const vipCodes = await telegramDB.getData('vipCodes') || CONFIG.vipCodes;
    vipCodes.splice(index, 1);
    
    await telegramDB.saveData('vipCodes', vipCodes);
    CONFIG.vipCodes = vipCodes;
    
    loadCodesList();
    alert('تم حذف الرمز بنجاح');
}

// تصفية المستخدمين
document.getElementById('userSearch')?.addEventListener('input', async (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const users = await telegramDB.getData('users') || [];
    const container = document.getElementById('usersList');
    
    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.phone.includes(searchTerm)
    );
    
    container.innerHTML = filteredUsers.map(user => `
        <div class="admin-item">
            <div class="admin-item-info">
                <img src="${user.photo}" alt="${user.name}" style="width: 40px; height: 40px; border-radius: 50%;">
                <div>
                    <strong>${user.name}</strong>
                    <p>📱 ${user.phone}</p>
                    <p>${user.isVip ? '✨ مميز' : 'عادي'}</p>
                </div>
            </div>
            <div class="admin-actions">
                ${!user.isAdmin ? `
                    <button onclick="banUser('${user.id}')" class="btn-warning">حظر</button>
                    <button onclick="deleteUser('${user.id}')" class="btn-danger">حذف</button>
                ` : ''}
            </div>
        </div>
    `).join('');
});