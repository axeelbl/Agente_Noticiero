export class ChatController {
    constructor(ui, avatar, apiUrl) {
        this.ui = ui;
        this.avatar = avatar;
        this.apiUrl = apiUrl;

        this.queue = [];
        this.processing = false;

        this.ui.sendBtn.addEventListener("click", () => this.queueMessage(this.ui.userInput.value));
        this.ui.userInput.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.queueMessage(this.ui.userInput.value);
                this.ui.userInput.value = "";
            }
        });
    }

    queueMessage(text) {
        if (!text.trim()) return;
        this.ui.addUserMessage(text.trim());
        this.queue.push(text.trim());
        this.processQueue();
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        const text = this.queue.shift();

        this.avatar.startTalking();
        this.ui.userInput.disabled = true;
        this.ui.sendBtn.disabled = true;

        try {
            const res = await fetch(this.apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_message: text })
            });
            const data = await res.json();
            await this.ui.addBotMessageTyping(data.bot_message);
        } catch (err) {
            await this.ui.addBotMessageTyping("❌ Error conectando con el servidor.");
            this.avatar.avatarStatus.textContent = "🔴 Error";
        } finally {
            this.avatar.stopTalking();
            this.ui.userInput.disabled = false;
            this.ui.sendBtn.disabled = false;
            this.ui.userInput.focus();
            this.processing = false;
            this.processQueue(); // siguiente mensaje
        }
    }
}
