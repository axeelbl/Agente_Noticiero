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

    // Mensaje de bienvenida
    setTimeout(() => {
        ui.addBotMessageTyping(
            "¡Hola! 👋 Soy el PeluqueroBot, tu peluquero profesional.\n\n" +
            "Puedes preguntarme sobre mi, cortes de pelo, precios y mucho más..."
        );
    }, 300);
});
