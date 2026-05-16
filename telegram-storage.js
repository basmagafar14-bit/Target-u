class TelegramStorage {
    constructor() {
        this.baseUrl = `https://api.telegram.org/bot${CONFIG.telegram?.token}`;
        this.chatId = CONFIG.telegram?.chatId;
    }

    async sendMessage(text, parseMode = 'HTML') {
        try {
            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: text,
                    parse_mode: parseMode
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }

    async sendDocument(file, caption = '') {
        const formData = new FormData();
        formData.append('chat_id', this.chatId);
        formData.append('document', file);
        if (caption) formData.append('caption', caption);

        try {
            const response = await fetch(`${this.baseUrl}/sendDocument`, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Error sending document:', error);
            return null;
        }
    }

    async sendPhoto(photo, caption = '') {
        const formData = new FormData();
        formData.append('chat_id', this.chatId);
        formData.append('photo', photo);
        if (caption) formData.append('caption', caption);

        try {
            const response = await fetch(`${this.baseUrl}/sendPhoto`, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Error sending photo:', error);
            return null;
        }
    }

    async sendVoice(voice) {
        const formData = new FormData();
        formData.append('chat_id', this.chatId);
        formData.append('voice', voice);

        try {
            const response = await fetch(`${this.baseUrl}/sendVoice`, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Error sending voice:', error);
            return null;
        }
    }

    async getUpdates(offset = 0) {
        try {
            const response = await fetch(`${this.baseUrl}/getUpdates?offset=${offset}`);
            return await response.json();
        } catch (error) {
            console.error('Error getting updates:', error);
            return null;
        }
    }

    // تخزين البيانات كـ JSON في رسالة مثبتة
    async saveData(key, data) {
        const message = `📦 DATA:${key}\n${JSON.stringify(data)}`;
        const result = await this.sendMessage(message);
        if (result?.result?.message_id) {
            try {
                await fetch(`${this.baseUrl}/pinChatMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chatId,
                        message_id: result.result.message_id
                    })
                });
            } catch (error) {
                console.error('Error pinning message:', error);
            }
        }
        return result;
    }

    // جلب البيانات المخزنة
    async getData(key) {
        const updates = await this.getUpdates();
        if (updates?.result) {
            for (let update of updates.result.reverse()) {
                if (update.message?.pinned_message?.text?.startsWith(`📦 DATA:${key}`)) {
                    const jsonStr = update.message.pinned_message.text.replace(`📦 DATA:${key}\n`, '');
                    return JSON.parse(jsonStr);
                }
            }
        }
        return null;
    }

    // حذف رسالة
    async deleteMessage(messageId) {
        try {
            const response = await fetch(`${this.baseUrl}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    message_id: messageId
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting message:', error);
            return null;
        }
    }

    // تعديل رسالة
    async editMessage(messageId, newText) {
        try {
            const response = await fetch(`${this.baseUrl}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    message_id: messageId,
                    text: newText,
                    parse_mode: 'HTML'
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error editing message:', error);
            return null;
        }
    }
}

const telegramDB = new TelegramStorage();