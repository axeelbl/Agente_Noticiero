import { AvatarController } from "./avatar.js";
import { ChatUI } from "./ui.js";
import { ChatController } from "./chat.js";

document.addEventListener("DOMContentLoaded", () => {
    const avatar = new AvatarController(
        document.getElementById("baseFace"),
        document.getElementById("mouthOpenImg"),
        document.getElementById("avatarHalo"),
        document.getElementById("avatar"),
        document.getElementById("avatarStatus")
    );

    const ui = new ChatUI(
        document.getElementById("chatContainer"),
        document.getElementById("userInput"),
        document.getElementById("sendBtn"),
        document.getElementById("clearBtn")
    );

    const chat = new ChatController(ui, avatar, "/chat");
    const reserveBtn = document.getElementById("reserveBtn");
    const manageBtn = document.getElementById("manageBtn");

    window.chatUI = ui;

    document.querySelectorAll("[data-prompt]").forEach(button => {
        button.addEventListener("click", () => {
            chat.queueMessage(button.dataset.prompt || "");
        });
    });

    document.querySelectorAll("[data-trigger-reserve]").forEach(button => {
        button.addEventListener("click", () => reserveBtn?.click());
    });

    document.querySelectorAll("[data-trigger-manage]").forEach(button => {
        button.addEventListener("click", () => manageBtn?.click());
    });

    setTimeout(() => {
        ui.addBotMessageTyping(
            "Hola, soy tu asistente de peluqueria.\n\n" +
            "Te ayudo con cortes, fotos y citas."
        );
    }, 300);
});
