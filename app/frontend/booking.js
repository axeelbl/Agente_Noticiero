document.addEventListener("DOMContentLoaded", () => {
    const reserveBtn = document.getElementById("reserveBtn");
    const modal = document.getElementById("bookingModal");
    const closeBtn = document.getElementById("closeModal");
    const form = document.getElementById("bookingForm");

    const dateInput = document.querySelector("input[name='date']");
    const timeSelect = document.getElementById("timeSelect");

    if (!dateInput || !timeSelect) return;

    // Abrir modal
    reserveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.classList.remove("hidden");
    });

    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // 🔹 Cargar horas disponibles
    dateInput.addEventListener("change", async () => {
        const date = dateInput.value;
        timeSelect.innerHTML = "<option>Cargando...</option>";

        try {
            const res = await fetch(`/booking/availability?date=${date}`);
            const hours = await res.json();

            timeSelect.innerHTML = "";

            if (!hours.length) {
                timeSelect.innerHTML = "<option>No hay horas disponibles</option>";
                return;
            }

            hours.forEach(hour => {
                const option = document.createElement("option");
                option.value = hour;
                option.textContent = hour;
                timeSelect.appendChild(option);
            });

        } catch (err) {
            timeSelect.innerHTML = "<option>Error cargando horas</option>";
        }
    });

    dateInput.min = new Date().toISOString().split("T")[0];

    // 🔹 Enviar reserva
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = Object.fromEntries(new FormData(form));

        try {
            const response = await fetch("/booking/reserve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error("Hora ocupada");
            }

            alert("✅ Cita reservada correctamente");
            modal.classList.add("hidden");
            form.reset();

        } catch (err) {
            alert("❌ Esa hora ya no está disponible");
        }
    });
});
