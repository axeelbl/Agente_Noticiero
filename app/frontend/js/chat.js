export class ChatController {
    constructor(ui, avatar, apiUrl) {
        this.ui = ui;
        this.avatar = avatar;
        this.apiUrl = apiUrl;

        this.queue = [];
        this.processing = false;

        // enviar mensaje
        this.ui.sendBtn.addEventListener("click", () =>
            this.queueMessage(this.ui.userInput.value)
        );

        // enter para enviar
        this.ui.userInput.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.queueMessage(this.ui.userInput.value);
                this.ui.userInput.value = "";
            }
        });

        // visor imágenes
        const viewer = document.getElementById("imageViewer");
        const closeBtn = document.getElementById("closeViewer");

        if (viewer && closeBtn) {
            // botón cerrar
            closeBtn.addEventListener("click", () => {
                viewer.classList.add("hidden");
            });

            // click fuera imagen
            viewer.addEventListener("click", e => {
                if (e.target === viewer) {
                    viewer.classList.add("hidden");
                }
            });
        }
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

            // galería de fotos
            if (data.photos) {
                const gallery = document.createElement("div");
                gallery.className = "photo-gallery";

                data.photos.forEach(src => {
                    const img = document.createElement("img");

                    // seguridad básica
                    if (src.startsWith("/static/")) {
                        img.src = src;
                    } else {
                        return;
                    }

                    img.className = "chat-photo";

                    // CLICK → abrir visor
                    img.addEventListener("click", () => {
                        const viewer = document.getElementById("imageViewer");
                        const viewerImg = document.getElementById("viewerImg");

                        if (viewer && viewerImg) {
                            viewerImg.src = src;
                            viewer.classList.remove("hidden");
                        }
                    });

                    gallery.appendChild(img);
                });

                this.ui.chatContainer.appendChild(gallery);
                this.ui.chatContainer.scrollTop = this.ui.chatContainer.scrollHeight;
            }

        } catch (err) {
            await this.ui.addBotMessageTyping("❌ Error conectando con el servidor.");
            this.avatar.avatarStatus.textContent = "🔴 Error";
        } finally {
            this.avatar.stopTalking();
            this.ui.userInput.disabled = false;
            this.ui.sendBtn.disabled = false;
            this.ui.userInput.focus();
            this.processing = false;
            this.processQueue();
        }
    }
}