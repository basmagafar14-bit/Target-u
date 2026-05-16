let currentRoom = 'general';
let replyingTo = null;
let mediaRecorder = null;
let audioChunks = [];

// تحميل غرف الدردشة
async function loadChatRooms() {
    const rooms = await telegramDB.getData('chatRooms') || [];
    const roomsList = document.getElementById('vipRoomsList');
    
    roomsList.innerHTML = rooms.map(room => `
        <div class="room-item" onclick="joinRoom('${room.id}')">
            <i class="fas fa-door-open"></i> ${room.name}
            <small>ID: ${room.id}</small>
        </div>
    `).join('');
    
    if (currentRoom === 'general') {
        joinGeneralChat();
    }
}

// الانضمام للدردشة العامة
function joinGeneralChat() {
    currentRoom = 'general';
    document.getElementById('currentRoomName').textContent = 'الدردشة العامة';
    document.getElementById('roomId').textContent = '';
    document.querySelectorAll('.room-item').forEach(r => r.classList.remove('active'));
    document.querySelector('.room-item:first-child').classList.add('active');
    loadMessages('general');
}

// الانضمام لغرفة
function joinRoom(roomId) {
    currentRoom = roomId;
    document.querySelectorAll('.room-item').forEach(r => r.classList.remove('active'));
    event.target.closest('.room-item').classList.add('active');
    
    const rooms = telegramDB.getData('chatRooms') || [];
    const room = rooms.find(r => r.id === roomId);
    if (room) {
        document.getElementById('currentRoomName').textContent = room.name;
        document.getElementById('roomId').textContent = `ID: ${room.id}`;
    }
    
    loadMessages(roomId);
}

// إنشاء غرفة جديدة
async function createNewRoom() {
    if (!isVipUser && !isAdmin) {
        alert('فقط المستخدمون المميزون يمكنهم إنشاء غرف');
        return;
    }
    
    const roomName = prompt('أدخل اسم الغرفة:');
    if (!roomName) return;
    
    const rooms = await telegramDB.getData('chatRooms') || [];
    const newRoom = {
        id: Date.now().toString().slice(-8),
        name: roomName,
        creator: currentUser.id,
        createdAt: new Date().toISOString()
    };
    
    rooms.push(newRoom);
    await telegramDB.saveData('chatRooms', rooms);
    
    // تحديث عداد الغرف
    const users = await telegramDB.getData('users') || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].roomsCount = (users[userIndex].roomsCount || 0) + 1;
        await telegramDB.saveData('users', users);
        currentUser.roomsCount = users[userIndex].roomsCount;
    }
    
    loadChatRooms();
    joinRoom(newRoom.id);
}

// البحث عن غرفة
async function searchRoom() {
    const searchId = document.getElementById('roomSearch').value;
    const rooms = await telegramDB.getData('chatRooms') || [];
    const room = rooms.find(r => r.id === searchId);
    
    if (room) {
        joinRoom(room.id);
    } else {
        alert('لم يتم العثور على الغرفة');
    }
}

// تحميل الرسائل
async function loadMessages(roomId) {
    const messages = await telegramDB.getData(`messages_${roomId}`) || [];
    const container = document.getElementById('chatMessages');
    
    container.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');
    container.scrollTop = container.scrollHeight;
}

// إنشاء HTML للرسالة
function createMessageHTML(msg) {
    const isSent = msg.senderId === currentUser?.id;
    const timeDiff = (Date.now() - new Date(msg.createdAt).getTime()) / 1000 / 60;
    const canEdit = isSent && timeDiff <= 10;
    
    let replyHTML = '';
    if (msg.replyTo) {
        replyHTML = `<div class="reply-indicator">
            <small>↩ رد على: ${msg.replyTo.preview}</small>
        </div>`;
    }
    
    let fileHTML = '';
    if (msg.file) {
        if (msg.fileType?.startsWith('image/')) {
            fileHTML = `<img src="${msg.fileUrl}" style="max-width: 200px; border-radius: 8px;">`;
        } else if (msg.fileType?.startsWith('audio/')) {
            fileHTML = `<audio controls src="${msg.fileUrl}"></audio>`;
        } else {
            fileHTML = `<a href="${msg.fileUrl}" target="_blank">📎 ${msg.fileName}</a>`;
        }
    }
    
    return `
        <div class="message ${isSent ? 'sent' : 'received'}" id="msg-${msg.id}">
            <div class="message-sender" onclick="viewProfile('${msg.senderId}')" style="cursor: pointer;">
                <img src="${msg.senderPhoto}" alt="${msg.senderName}">
                <span>${msg.senderName}</span>
                ${msg.senderGender === 'male' ? '♂' : '♀'}
            </div>
            ${replyHTML}
            <div class="message-content">${msg.content}</div>
            ${fileHTML}
            <div class="message-time">
                ${formatDate(msg.createdAt)}
                ${msg.edited ? ' (تم التعديل)' : ''}
                ${msg.replied ? ' ✓ تم الرد' : ''}
            </div>
            <div class="message-actions">
                <button onclick="replyToMessage('${msg.id}', '${msg.senderName}', '${msg.content?.substring(0, 50)}')">
                    <i class="fas fa-reply"></i> رد
                </button>
                ${canEdit || isAdmin ? `<button onclick="editMessage('${msg.id}')">
                    <i class="fas fa-edit"></i> تعديل
                </button>` : ''}
                ${canEdit || isAdmin ? `<button onclick="deleteMessage('${msg.id}')">
                    <i class="fas fa-trash"></i> حذف
                </button>` : ''}
            </div>
        </div>
    `;
}

// إرسال رسالة
async function sendMessage() {
    const content = document.getElementById('messageInput').value.trim();
    const fileInput = document.getElementById('fileInput');
    
    if (!content && !fileInput.files.length) return;
    
    const messages = await telegramDB.getData(`messages_${currentRoom}`) || [];
    const newMessage = {
        id: Date.now().toString(),
        content: content,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderPhoto: currentUser.photo,
        senderGender: currentUser.gender,
        roomId: currentRoom,
        createdAt: new Date().toISOString(),
        replyTo: replyingTo,
        replied: false
    };
    
    // معالجة الملفات
    if (fileInput.files.length) {
        const file = fileInput.files[0];
        if (file.type.startsWith('image/')) {
            const result = await telegramDB.sendPhoto(file, 'chat_image');
            if (result?.result?.photo) {
                const photo = result.result.photo[result.result.photo.length - 1];
                newMessage.fileUrl = `https://api.telegram.org/file/bot${CONFIG.telegram.token}/${photo.file_path}`;
                newMessage.fileType = file.type;
            }
        } else if (file.type.startsWith('audio/')) {
            const result = await telegramDB.sendVoice(file);
            if (result?.result?.voice) {
                newMessage.fileUrl = `https://api.telegram.org/file/bot${CONFIG.telegram.token}/${result.result.voice.file_path}`;
                newMessage.fileType = file.type;
            }
        } else {
            const result = await telegramDB.sendDocument(file, file.name);
            if (result?.result?.document) {
                newMessage.fileUrl = `https://api.telegram.org/file/bot${CONFIG.telegram.token}/${result.result.document.file_path}`;
                newMessage.fileType = file.type;
                newMessage.fileName = file.name;
            }
        }
    }
    
    // إذا كانت رسالة رد، تحديث الرسالة الأصلية
    if (replyingTo) {
        const repliedMsg = messages.find(m => m.id === replyingTo.messageId);
        if (repliedMsg) {
            repliedMsg.replied = true;
        }
    }
    
    messages.push(newMessage);
    await telegramDB.saveData(`messages_${currentRoom}`, messages);
    
    // إعادة تعيين
    document.getElementById('messageInput').value = '';
    document.getElementById('fileInput').value = '';
    replyingTo = null;
    
    loadMessages(currentRoom);
}

// الرد على رسالة
function replyToMessage(messageId, senderName, preview) {
    replyingTo = {
        messageId: messageId,
        senderName: senderName,
        preview: preview
    };
    
    document.getElementById('messageInput').focus();
    document.getElementById('messageInput').placeholder = `الرد على ${senderName}: ${preview}...`;
}

// تعديل رسالة
async function editMessage(messageId) {
    const newContent = prompt('عدل الرسالة:');
    if (!newContent) return;
    
    const messages = await telegramDB.getData(`messages_${currentRoom}`) || [];
    const msgIndex = messages.findIndex(m => m.id === messageId);
    
    if (msgIndex !== -1) {
        const timeDiff = (Date.now() - new Date(messages[msgIndex].createdAt).getTime()) / 1000 / 60;
        
        if (!isAdmin && timeDiff > 10) {
            alert('يمكن تعديل الرسائل فقط خلال 10 دقائق من إرسالها');
            return;
        }
        
        messages[msgIndex].content = newContent;
        messages[msgIndex].edited = true;
        await telegramDB.saveData(`messages_${currentRoom}`, messages);
        loadMessages(currentRoom);
    }
}

// حذف رسالة
async function deleteMessage(messageId) {
    if (!confirm('هل أنت متأكد من حذف الرسالة؟')) return;
    
    const messages = await telegramDB.getData(`messages_${currentRoom}`) || [];
    const msgIndex = messages.findIndex(m => m.id === messageId);
    
    if (msgIndex !== -1) {
        const timeDiff = (Date.now() - new Date(messages[msgIndex].createdAt).getTime()) / 1000 / 60;
        
        if (!isAdmin && timeDiff > 10) {
            alert('يمكن حذف الرسائل فقط خلال 10 دقائق من إرسالها');
            return;
        }
        
        messages.splice(msgIndex, 1);
        await telegramDB.saveData(`messages_${currentRoom}`, messages);
        loadMessages(currentRoom);
    }
}

// عرض الملف الشخصي
async function viewProfile(userId) {
    const users = await telegramDB.getData('users') || [];
    const user = users.find(u => u.id === userId);
    
    if (user) {
        alert(`
            الاسم: ${user.name}
            العمر: ${user.age}
            النوع: ${user.gender === 'male' ? 'ذكر' : 'أنثى'}
            الوصف: ${user.bio || 'لا يوجد'}
            ${user.isVip ? '✨ مستخدم مميز' : 'مستخدم عادي'}
        `);
    }
}

// تسجيل صوتي
async function startVoiceRecord() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioFile = new File([audioBlob], 'voice_message.wav', { type: 'audio/wav' });
            
            const fileInput = document.getElementById('fileInput');
            const dt = new DataTransfer();
            dt.items.add(audioFile);
            fileInput.files = dt.files;
            
            await sendMessage();
            audioChunks = [];
        };
        
        mediaRecorder.start();
        document.querySelector('.voice-btn').classList.add('voice-recording');
        
        setTimeout(() => {
            mediaRecorder.stop();
            document.querySelector('.voice-btn').classList.remove('voice-recording');
            stream.getTracks().forEach(track => track.stop());
        }, 10000);
        
        alert('جاري التسجيل... اضغط موافق لإيقاف التسجيل');
        mediaRecorder.stop();
        document.querySelector('.voice-btn').classList.remove('voice-recording');
        stream.getTracks().forEach(track => track.stop());
    } catch (error) {
        console.error('Error recording:', error);
        alert('لا يمكن الوصول للميكروفون');
    }
}

// إنشاء استطلاع رأي
function createPoll() {
    if (!isVipUser && !isAdmin) {
        alert('فقط المستخدمون المميزون يمكنهم إنشاء استطلاعات');
        return;
    }
    document.getElementById('pollModal').classList.remove('hidden');
}

function addPollOption() {
    const pollOptions = document.getElementById('pollOptions');
    const optionCount = pollOptions.children.length;
    
    const newOption = document.createElement('div');
    newOption.className = 'form-group';
    newOption.innerHTML = `
        <label>الخيار ${optionCount + 1}</label>
        <input type="text" class="poll-option">
    `;
    pollOptions.appendChild(newOption);
}

async function submitPoll() {
    const question = document.getElementById('pollQuestion').value;
    const options = Array.from(document.querySelectorAll('.poll-option'))
        .map(input => input.value)
        .filter(val => val.trim());
    
    if (!question || options.length < 2) {
        alert('يرجى إدخال السؤال وخيارين على الأقل');
        return;
    }
    
    const messages = await telegramDB.getData(`messages_${currentRoom}`) || [];
    const pollMessage = {
        id: Date.now().toString(),
        type: 'poll',
        content: `📊 استطلاع: ${question}`,
        pollData: {
            question,
            options: options.map(opt => ({ text: opt, votes: 0, voters: [] }))
        },
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderPhoto: currentUser.photo,
        roomId: currentRoom,
        createdAt: new Date().toISOString()
    };
    
    messages.push(pollMessage);
    await telegramDB.saveData(`messages_${currentRoom}`, messages);
    
    closePollModal();
    loadMessages(currentRoom);
}

function closePollModal() {
    document.getElementById('pollModal').classList.add('hidden');
    document.getElementById('pollQuestion').value = '';
    document.getElementById('pollOptions').innerHTML = '';
}

function closeReplyModal() {
    document.getElementById('replyModal').classList.add('hidden');
}