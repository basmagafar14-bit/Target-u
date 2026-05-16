// التنقل بين الصفحات
function navigateTo(page) {
    document.querySelectorAll('.sub-page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    switch(page) {
        case 'opportunities':
            document.getElementById('opportunitiesPage').classList.remove('hidden');
            document.querySelector('.nav-btn:nth-child(1)').classList.add('active');
            loadOpportunities();
            break;
        case 'chat':
            document.getElementById('chatPage').classList.remove('hidden');
            document.querySelector('.nav-btn:nth-child(2)').classList.add('active');
            loadChatRooms();
            break;
        case 'profile':
            document.getElementById('profilePage').classList.remove('hidden');
            document.querySelector('.nav-btn:nth-child(3)').classList.add('active');
            loadProfile();
            break;
    }
}

// تحديث واجهة المستخدم
function updateUI() {
    if (!currentUser) return;
    
    // إظهار/إخفاء أزرار VIP
    const newPostBtn = document.getElementById('newPostBtn');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const pollBtn = document.getElementById('pollBtn');
    const vipStats = document.getElementById('vipStats');
    
    if (isVipUser || isAdmin) {
        if (newPostBtn) newPostBtn.style.display = 'inline-block';
        if (createRoomBtn) createRoomBtn.style.display = 'inline-block';
        if (pollBtn) pollBtn.style.display = 'inline-block';
        if (vipStats) vipStats.classList.remove('hidden');
    } else {
        if (newPostBtn) newPostBtn.style.display = 'none';
        if (createRoomBtn) createRoomBtn.style.display = 'none';
        if (pollBtn) pollBtn.style.display = 'none';
        if (vipStats) vipStats.classList.add('hidden');
    }
}

// تحميل المنح والفرص
async function loadOpportunities() {
    const posts = await telegramDB.getData('opportunities') || [];
    const container = document.getElementById('opportunitiesList');
    
    container.innerHTML = posts.reverse().map(post => `
        <div class="opportunity-card">
            <div class="card-header">
                <h3>${post.title}</h3>
                <span class="card-type ${post.type}">${post.type === 'scholarship' ? 'منحة دراسية' : 'فرصة عمل'}</span>
            </div>
            <p>${post.content}</p>
            <div class="card-sender">
                <img src="${post.senderPhoto}" alt="${post.senderName}">
                <strong>${post.senderName}</strong>
                <span class="card-time">${formatDate(post.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

// إضافة منشور جديد
function showNewPostModal() {
    document.getElementById('newPostModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('newPostModal').classList.add('hidden');
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
}

async function addNewPost() {
    const title = document.getElementById('postTitle').value;
    const type = document.getElementById('postType').value;
    const content = document.getElementById('postContent').value;
    
    if (!title || !content) {
        alert('يرجى ملء جميع الحقول');
        return;
    }
    
    const posts = await telegramDB.getData('opportunities') || [];
    const newPost = {
        id: Date.now().toString(),
        title,
        type,
        content,
        senderName: currentUser.name,
        senderPhoto: currentUser.photo,
        senderId: currentUser.id,
        createdAt: new Date().toISOString()
    };
    
    posts.push(newPost);
    await telegramDB.saveData('opportunities', posts);
    
    // تحديث عداد منشورات المستخدم
    if (isVipUser || isAdmin) {
        const users = await telegramDB.getData('users') || [];
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].postsCount = (users[userIndex].postsCount || 0) + 1;
            await telegramDB.saveData('users', users);
            currentUser.postsCount = users[userIndex].postsCount;
        }
    }
    
    closeModal();
    loadOpportunities();
}

// تحميل الملف الشخصي
function loadProfile() {
    if (!currentUser) return;
    
    document.getElementById('profilePhoto').src = currentUser.photo;
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileBio').textContent = currentUser.bio || 'لا يوجد وصف';
    document.getElementById('profileGender').textContent = currentUser.gender === 'male' ? 'ذكر' : 'أنثى';
    
    document.getElementById('editName').value = currentUser.name;
    document.getElementById('editBio').value = currentUser.bio || '';
    
    if (isVipUser || isAdmin) {
        document.getElementById('vipStats').classList.remove('hidden');
        document.getElementById('postsCount').textContent = currentUser.postsCount || 0;
        document.getElementById('roomsCount').textContent = currentUser.roomsCount || 0;
        document.getElementById('subscribersCount').textContent = currentUser.subscribersCount || 0;
    }
}

// تحديث الملف الشخصي
async function updateProfile() {
    const users = await telegramDB.getData('users') || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
        const photoFile = document.getElementById('editPhoto').files[0];
        if (photoFile) {
            const result = await telegramDB.sendPhoto(photoFile);
            if (result?.result?.photo) {
                const photo = result.result.photo[result.result.photo.length - 1];
                users[userIndex].photo = `https://api.telegram.org/file/bot${CONFIG.telegram.token}/${photo.file_path}`;
            }
        }
        
        users[userIndex].name = document.getElementById('editName').value;
        users[userIndex].bio = document.getElementById('editBio').value;
        
        await telegramDB.saveData('users', users);
        currentUser = users[userIndex];
        loadProfile();
        alert('تم تحديث الملف الشخصي بنجاح');
    }
}

// إعدادات الوضع
function toggleSettings() {
    const menu = document.getElementById('settingsMenu');
    menu.classList.toggle('hidden');
}

function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('targetu_theme', newTheme);
}

// تنسيق التاريخ
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('ar-EG', options);
}

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تحميل السمة المحفوظة
    const savedTheme = localStorage.getItem('targetu_theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }
    
    checkFirstVisit();
});