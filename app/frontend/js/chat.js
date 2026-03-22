export class ChatController {
    constructor(ui, avatar, apiUrl) {
        this.ui = ui;
        this.avatar = avatar;
        this.apiUrl = apiUrl;

        this.queue = [];
        this.processing = false;
        this.currentPhotos = [];
        this.currentIndex = 0;

        this.ui.sendBtn.addEventListener("click", () => this.submitCurrentInput());
        this.ui.userInput.addEventListener("keydown", event => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            this.submitCurrentInput();
        });

        this.setupViewerControls();
    }

    setupViewerControls() {
        const viewer = document.getElementById("imageViewer");
        const closeBtn = document.getElementById("closeViewer");
        const leftBtn = document.getElementById("viewerLeft");
        const rightBtn = document.getElementById("viewerRight");

        if (closeBtn && viewer) {
            closeBtn.addEventListener("click", () => viewer.classList.add("hidden"));
        }

        if (viewer) {
            viewer.addEventListener("click", event => {
                if (event.target === viewer) {
                    viewer.classList.add("hidden");
                }
            });
        }

        if (leftBtn) {
            leftBtn.addEventListener("click", event => {
                event.stopPropagation();
                this.showPrev();
            });
        }

        if (rightBtn) {
            rightBtn.addEventListener("click", event => {
                event.stopPropagation();
                this.showNext();
            });
        }

        document.addEventListener("keydown", event => {
            if (!viewer || viewer.classList.contains("hidden")) return;

            if (event.key === "ArrowRight") this.showNext();
            if (event.key === "ArrowLeft") this.showPrev();
            if (event.key === "Escape") viewer.classList.add("hidden");
        });
    }

    submitCurrentInput() {
        const wasQueued = this.queueMessage(this.ui.userInput.value);

        if (wasQueued) {
            this.ui.userInput.value = "";
        }
    }

    openViewer(index) {
        const viewer = document.getElementById("imageViewer");
        const viewerImg = document.getElementById("viewerImg");

        if (!viewer || !viewerImg || !this.currentPhotos.length) return;

        this.currentIndex = index;
        viewerImg.src = this.currentPhotos[this.currentIndex];
        viewer.classList.remove("hidden");
    }

    showNext() {
        if (!this.currentPhotos.length) return;
        const viewerImg = document.getElementById("viewerImg");
        if (!viewerImg) return;
        this.currentIndex = (this.currentIndex + 1) % this.currentPhotos.length;
        viewerImg.src = this.currentPhotos[this.currentIndex];
    }

    showPrev() {
        if (!this.currentPhotos.length) return;
        const viewerImg = document.getElementById("viewerImg");
        if (!viewerImg) return;
        this.currentIndex = (this.currentIndex - 1 + this.currentPhotos.length) % this.currentPhotos.length;
        viewerImg.src = this.currentPhotos[this.currentIndex];
    }

    queueMessage(text) {
        const message = text.trim();
        if (!message) return false;

        this.ui.addUserMessage(message);
        this.queue.push(message);
        this.processQueue();
        return true;
    }

    buildPhotoGallery(photos) {
        const galleryBlock = document.createElement("section");
        galleryBlock.className = "chat-gallery";

        const galleryTop = document.createElement("div");
        galleryTop.className = "gallery-top";

        const galleryHeading = document.createElement("div");
        galleryHeading.className = "gallery-heading";
        galleryHeading.textContent = "Inspiracion visual";

        const gallerySubtitle = document.createElement("div");
        gallerySubtitle.className = "gallery-subtitle";
        gallerySubtitle.textContent =
            photos.length === 1
                ? "1 referencia disponible"
                : `${photos.length} referencias disponibles`;

        galleryTop.append(galleryHeading, gallerySubtitle);

        const gallery = document.createElement("div");
        gallery.className = "photo-gallery";

        photos.forEach((src, index) => {
            const photoButton = document.createElement("button");
            photoButton.type = "button";
            photoButton.className = "photo-card";
            photoButton.setAttribute("aria-label", `Abrir foto ${index + 1}`);

            const img = document.createElement("img");
            img.src = src;
            img.alt = `Referencia visual ${index + 1}`;
            img.className = "chat-photo";

            const copy = document.createElement("div");
            copy.className = "photo-card-copy";

            const title = document.createElement("span");
            title.textContent = `Foto ${index + 1}`;

            const action = document.createElement("span");
            action.textContent = "Ampliar";

            copy.append(title, action);
            photoButton.append(img, copy);

            photoButton.addEventListener("click", () => {
                this.openViewer(index);
            });

            gallery.appendChild(photoButton);
        });

        galleryBlock.append(galleryTop, gallery);
        return galleryBlock;
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        const text = this.queue.shift();

        this.avatar.startTalking();
        this.ui.setPendingState(true);
        this.ui.userInput.disabled = true;
        this.ui.sendBtn.disabled = true;
        this.ui.clearBtn.disabled = true;

        try {
            const res = await fetch(this.apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_message: text })
            });

            const data = await res.json();
            await this.ui.addBotMessageTyping(data.bot_message);

            if (data.photos && data.photos.length) {
                this.currentPhotos = data.photos;
                this.ui.chatContainer.appendChild(this.buildPhotoGallery(data.photos));
                this.ui.scrollToBottom();
            }
        } catch (err) {
            await this.ui.addBotMessageTyping("Error conectando con el servidor.");
            this.avatar.avatarStatus.textContent = "Error";
        } finally {
            this.avatar.stopTalking();
            this.ui.setPendingState(false);
            this.ui.userInput.disabled = false;
            this.ui.sendBtn.disabled = false;
            this.ui.clearBtn.disabled = false;
            this.ui.userInput.focus();
            this.processing = false;
            this.processQueue();
        }
    }
}
