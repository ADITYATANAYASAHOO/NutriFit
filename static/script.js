// ===== GLOBAL DATA =====

let proteinGoal = parseFloat(document.body.dataset.protein)
const username = document.body.dataset.username

let totalCalories = 0
let totalProtein = 0
let totalCarbs = 0
let totalFat = 0

let meals = []

window.goalReached = false


// ===== LOAD & SAVE STATE =====

function loadState() {
    const saved = localStorage.getItem("nutrifit_state")

    if (saved) {
        const state = JSON.parse(saved)

        totalCalories = state.totalCalories || 0
        totalProtein = state.totalProtein || 0
        totalCarbs = state.totalCarbs || 0
        totalFat = state.totalFat || 0
        meals = state.meals || []

        updateDashboard()

        const result = document.querySelector(".meal-result")

        if (result) {
            meals.forEach(m => {
                result.innerHTML += `
                <div class="food-item">
                    <strong>${m.food}</strong> x ${m.qty}<br>
                    Calories: ${m.calories} | Protein: ${m.protein}g
                </div>`
            })
        }
    }
}

function saveState() {
    localStorage.setItem("nutrifit_state", JSON.stringify({
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        meals
    }))
}


// ===== DASHBOARD UPDATE =====

function updateDashboard() {

    document.getElementById("total-calories").innerText = totalCalories.toFixed(0)
    document.getElementById("total-protein").innerText = totalProtein.toFixed(0)
    document.getElementById("total-carbs").innerText = totalCarbs.toFixed(0)
    document.getElementById("total-fat").innerText = totalFat.toFixed(0)

    const remaining = proteinGoal - totalProtein
    document.getElementById("remaining-protein").innerText = remaining.toFixed(0)

    const status = document.getElementById("protein-status")

    if (remaining <= 0) {
        status.innerText = "🔥 Protein goal achieved!"
        status.style.color = "#22c55e"

        if (!window.goalReached) {
            alert("🎉 Protein goal completed!")
            window.goalReached = true
        }

    } else {
        status.innerText = `You need ${remaining.toFixed(0)}g more protein`
        status.style.color = "#f59e0b"
    }
}


// ===== ADD FOOD =====

function addFood(button) {

    const container = button.closest(".meal")
    const input = container.querySelector(".food-input")
    const qtyInput = container.querySelector(".food-qty")

    const food = input.value.trim()
    const qty = qtyInput.value ? parseFloat(qtyInput.value) : 1

    if (!food) return

    fetch("/get_food_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            food: food,
            quantity: qty
        })
    })
    .then(res => res.json())
    .then(data => {

        totalCalories += data.calories
        totalProtein += data.protein
        totalCarbs += data.carbs
        totalFat += data.fat

        meals.push({
            food,
            qty,
            calories: data.calories,
            protein: data.protein
        })

        saveState()
        updateDashboard()

        const resultDiv = container.querySelector(".meal-result")

        resultDiv.innerHTML += `
            <p>${food} (${qty}) → ${data.protein}g protein</p>
        `

        input.value = ""
        qtyInput.value = ""
    })
}


// ===== AUTOCOMPLETE =====

function getSuggestions(input) {

    const query = input.value
    const box = input.nextElementSibling

    if (query.length === 0) {
        box.innerHTML = ""
        return
    }

    fetch("/suggest_food?q=" + query)
    .then(res => res.json())
    .then(data => {

        box.innerHTML = ""

        data.forEach(food => {
            const div = document.createElement("div")
            div.innerText = food

            div.onclick = () => {
                input.value = food
                box.innerHTML = ""
            }

            box.appendChild(div)
        })
    })
}


// ===== NUTRIBOT =====

document.addEventListener("DOMContentLoaded", () => {

    loadState()  // ✅ IMPORTANT

    const toggle = document.getElementById("nutriToggle")
    const windowBox = document.getElementById("nutriWindow")
    const closeBtn = document.getElementById("nutriClose")
    const chatBox = document.getElementById("nutriMessages")

    const greetings = [
        `Welcome ${username}! 👋`,
        `Welcome back ${username}! 😎`,
        `Good to see you ${username}! 💪`,
        `Hey ${username}, ready to crush your goals? 🔥`,
        `Yo ${username}! Let’s get those gains 💥`
    ]

    function getRandomGreeting() {
        return greetings[Math.floor(Math.random() * greetings.length)]
    }

    if (toggle && windowBox) {
        toggle.addEventListener("click", () => {

            windowBox.style.display = "flex"
            chatBox.innerHTML = ""

            chatBox.innerHTML += `
            <div class="chat-msg bot">
                <div class="chat-avatar">🤖</div>
                <div>${getRandomGreeting()}</div>
            </div>`
        })
    }

    if (closeBtn && windowBox) {
        closeBtn.addEventListener("click", () => {
            windowBox.style.display = "none"
        })
    }

    // ENTER TO SEND
    const inputBox = document.getElementById("nutriInput")

    if (inputBox) {
        inputBox.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
            }
        })
    }

})


// ===== SEND MESSAGE =====

function sendMessage() {

    const input = document.getElementById("nutriInput")
    const message = input.value

    if (!message.trim()) return

    const chatBox = document.getElementById("nutriMessages")

    chatBox.innerHTML += `
    <div class="chat-msg user">
        <div class="chat-bubble">${message}</div>
    </div>`

    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: message,
            protein: totalProtein,
            goal: proteinGoal,
            meals: meals
        })
    })
    .then(res => res.json())
    .then(data => {

        chatBox.innerHTML += `
        <div class="chat-msg bot">
            <div class="chat-avatar">🤖</div>
            <div class="chat-bubble">${data.reply}</div>
        </div>`

        chatBox.scrollTop = chatBox.scrollHeight
    })

    input.value = ""
}