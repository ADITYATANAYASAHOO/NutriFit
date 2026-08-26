// ===== GLOBAL DATA =====

let proteinGoal = parseFloat(document.body.dataset.protein)
const username = document.body.dataset.username

let totalCalories = 0
let totalProtein = 0
let totalCarbs = 0
let totalFat = 0

let meals = []

window.goalReached = false


// ===== INIT (RUN ON PAGE LOAD) =====

document.addEventListener("DOMContentLoaded", () => {

    // ===== DAILY RESET LOGIC =====

    const today = new Date().toDateString()
    const savedDate = localStorage.getItem("nutrifit_date")

    if (savedDate !== today) {
        localStorage.removeItem("nutrifit_state")
        localStorage.setItem("nutrifit_date", today)

        totalCalories = 0
        totalProtein = 0
        totalCarbs = 0
        totalFat = 0
        meals = []

        window.goalReached = false
    }

    loadState()

    // ===== NUTRIBOT SETUP =====

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

    // ENTER KEY SEND

    const inputBox = document.getElementById("nutriInput")

    if (inputBox) {
        inputBox.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
            }
        })
    }

    // DIET PLAN CHECKBOX LISTENER
    
    document.querySelectorAll("#veg-plan input, #nonveg-plan input")
    .forEach(box => {
        box.addEventListener("change", updateDietPlanMacros)
    })
})


// ===== LOAD STATE =====

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


// ===== SAVE STATE =====

function saveState() {
    localStorage.setItem("nutrifit_state", JSON.stringify({
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        meals
    }))
}


// ===== UPDATE DASHBOARD =====

function updateDashboard() {

    document.getElementById("total-calories").innerText = totalCalories.toFixed(0)
    document.getElementById("total-protein").innerText = totalProtein.toFixed(0)
    document.getElementById("total-carbs").innerText = totalCarbs.toFixed(0)
    document.getElementById("total-fat").innerText = totalFat.toFixed(0)

    const calorieGoal = parseFloat(
        document.getElementById("goal-calories").innerText
    )

    const proteinGoal = parseFloat(
        document.getElementById("goal-protein").innerText
    )

    const carbGoal = parseFloat(
        document.getElementById("goal-carbs").innerText
    )

    const fatGoal = parseFloat(
        document.getElementById("goal-fat").innerText
    )

    updateMacroStatus(
        "calorie-status",
        totalCalories,
        calorieGoal,
        0.9,
        "🔥",
        "kcal"
    )

    updateMacroStatus(
        "protein-status",
        totalProtein,
        proteinGoal,
        0.8,
        "💪",
        "g"
    )

    updateMacroStatus(
        "carb-status",
        totalCarbs,
        carbGoal,
        0.8,
        "🌾",
        "g"
    )

    updateMacroStatus(
        "fat-status",
        totalFat,
        fatGoal,
        0.8,
        "🥑",
        "g"
    )
}

function updateMacroStatus(id, consumed, target, threshold, emoji, unit) {
    const thresholdValue = target * threshold
    const element = document.getElementById(id)

    if (consumed < thresholdValue) {
        const remaining = Math.ceil(thresholdValue - consumed)
        element.innerText =
            `${emoji} Need ${remaining}${unit} more for completion`
        element.style.color = "#f59e0b"
    }

    else if (consumed < target) {
        const optional = Math.ceil(target - consumed)
        element.innerText =
            `✅ Goal completed — optional +${optional}${unit}`
        element.style.color = "#22c55e"
    }

    else {
        element.innerText =
            "🔥 Excellent! Target exceeded"
        element.style.color = "#22c55e"
    }
}


// ===== ADD FOOD =====

function addFood(button) {

    const container = button.closest(".meal")
    const input = container.querySelector(".food-input")
    const qtyInput = container.querySelector(".food-qty")

    const food = input.value.trim()
    if (!food) return

    const qtyValue = qtyInput.value ? parseFloat(qtyInput.value) : 1
    const unit = container.querySelector(".food-unit").value

    let qty = qtyValue

    // piece → grams
    if (unit === "piece") {
        const conversions = {
            "roti": 40,
            "egg": 50,
            "bread": 25,
            "banana": 120
        }

        for (let key in conversions) {
            if (food.toLowerCase().includes(key)) {
                qty = qtyValue * conversions[key]
                break
            }
        }
    }

    // ml → grams
    if (unit === "ml") {
        qty = qtyValue
    }

    fetch("/get_food_data", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ food, quantity: qty })
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
            <p>${food} (${qtyValue} ${unit}) → ${data.protein}g protein</p>
        `

        input.value = ""
        qtyInput.value = ""
    })
}


// ===== AUTOCOMPLETE =====

function getSuggestions(input) {

    const query = input.value
    const box = input.nextElementSibling

    if (!query) {
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


// ===== CHAT =====

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
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            message,
            protein: totalProtein,
            goal: proteinGoal,
            meals
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


// ===== DIET PLAN SWITCH =====

function showDietPlan(type) {
    const vegPlan = document.getElementById("veg-plan");
    const nonVegPlan = document.getElementById("nonveg-plan");

    if (type === "veg") {
        vegPlan.style.display = "block";
        nonVegPlan.style.display = "none";
    } else {
        vegPlan.style.display = "none";
        nonVegPlan.style.display = "block";
    }
}


// ===== DIET PLAN MACROS =====

function updateDietPlanMacros() {

    let calories = 0
    let protein = 0
    let carbs = 0
    let fat = 0

    document.querySelectorAll("#veg-plan input:checked, #nonveg-plan input:checked")
    .forEach(box => {

        const text = box.parentElement.innerText.toLowerCase()

        if (text.includes("smoothie")) {
            calories += 400
            protein += 30
            carbs += 35
            fat += 12
        }

        if (text.includes("paneer 50g")) {
            calories += 150
            protein += 9
            fat += 10
        }

        if (text.includes("paneer 100g")) {
            calories += 300
            protein += 18
            fat += 20
        }

        if (text.includes("chicken 100g")) {
            calories += 165
            protein += 31
            fat += 4
        }

        if (text.includes("chicken 150g")) {
            calories += 250
            protein += 45
            fat += 6
        }

        if (text.includes("banana")) {
            calories += 100
            protein += 1
            carbs += 27
        }

        if (text.includes("bread + peanut butter")) {
            calories += 300
            protein += 12
            carbs += 25
            fat += 14
        }

        if (text.includes("2 roti")) {
            calories += 200
            protein += 6
            carbs += 35
        }

        if (text.includes("rice")) {
            calories += 200
            protein += 4
            carbs += 45
        }
    })

    totalCalories = calories
    totalProtein = protein
    totalCarbs = carbs
    totalFat = fat

    updateDashboard()
    saveState()
}

function showGoalInfo() {

    const goal = document.getElementById("goal-select").value
    const box = document.getElementById("goal-info")

    let text = ""

    if (goal === "cut") {
        text = "Lose fat by eating fewer calories than your body needs."
    }

    else if (goal === "lean_bulk") {
        text = "Gain muscle slowly with minimal fat gain."
    }

    else if (goal === "bulk") {
        text = "Gain muscle faster with higher calorie intake (some fat gain expected)."
    }

    else if (goal === "recomp") {
        text = "Build muscle and lose fat at the same time."
    }

    else if (goal === "maintain") {
        text = "Maintain your current weight and fitness level."
    }

    box.innerText = text
}

function openDeleteModal() {
    document.getElementById("deleteModal").style.display = "flex";
}

function closeDeleteModal() {
    document.getElementById("deleteModal").style.display = "none";
}

document.addEventListener("wheel", function (event) {
    const input = event.target.closest('input[type="number"]');

    if (input) {
        event.preventDefault();
    }
}, { passive: false });

// ========================================
// NUTRIFIT SIGNUP ONBOARDING
// ========================================

let signupStep = 0;

const signupCards = document.querySelectorAll(
    "#signup-form .onboarding-card"
);

const welcomeCard = document.querySelector(
    '[data-step="welcome"]'
);


function showSignupStep(step) {

    signupCards.forEach((card, index) => {

        card.classList.toggle(
            "active",
            index === step
        );

    });

}


function startSignup() {

    if (welcomeCard) {
        welcomeCard.classList.remove("active");
    }

    signupStep = 0;

    showSignupStep(signupStep);
}


function nextSignupStep() {

    const currentCard = signupCards[signupStep];

    const inputs = currentCard.querySelectorAll(
        "input"
    );

    for (const input of inputs) {

        if (!input.checkValidity()) {

            input.reportValidity();

            return;
        }
    }


    // Password confirmation

    if (signupStep === 3) {

        const password =
            document.getElementById(
                "signup-password"
            ).value;

        const confirmPassword =
            document.getElementById(
                "signup-confirm-password"
            ).value;

        if (password !== confirmPassword) {

            const error =
                document.getElementById(
                    "signup-error"
                );

            error.textContent =
                "Passwords do not match.";

            error.style.display = "block";

            return;
        }
    }


    if (signupStep < signupCards.length - 1) {

        signupStep++;

        showSignupStep(signupStep);
    }
}


function previousSignupStep() {

    if (signupStep > 0) {

        signupStep--;

        showSignupStep(signupStep);
    }
}

// ========================================
// LOGIN CARD FLOW
// ========================================

let loginStep = 0;

const loginCards = document.querySelectorAll(
    "#login-form .onboarding-card"
);


function showLoginStep(step) {

    loginCards.forEach(function(card, index) {

        card.classList.toggle(
            "active",
            index === step
        );

    });

}


function nextLoginStep() {

    const currentCard = loginCards[loginStep];

    const input = currentCard.querySelector("input");

    if (input && !input.checkValidity()) {

        input.reportValidity();

        return;
    }

    if (loginStep < loginCards.length - 1) {

        loginStep++;

        showLoginStep(loginStep);
    }

}


function previousLoginStep() {

    if (loginStep > 0) {

        loginStep--;

        showLoginStep(loginStep);
    }

}

// ========================================
// REGISTRATION CARD FLOW
// ========================================

let registerStep = 0;

const registerCards = document.querySelectorAll(
    "#register-form .onboarding-card"
);


function showRegisterStep(step) {

    registerCards.forEach(function(card, index) {

        card.classList.toggle(
            "active",
            index === step
        );

    });

}


function nextRegisterStep() {

    const currentCard =
        registerCards[registerStep];

    const input =
        currentCard.querySelector("input");

    if (input && !input.checkValidity()) {

        input.reportValidity();

        return;
    }


    // Check password confirmation

    if (registerStep === 3) {

        const password =
            document.getElementById(
                "register-password"
            ).value;

        const confirmPassword =
            document.getElementById(
                "register-confirm-password"
            ).value;

        if (password !== confirmPassword) {

            const error =
                document.getElementById(
                    "register-error"
                );

            error.textContent =
                "Passwords do not match.";

            error.style.display = "block";

            return;
        }
    }


    if (
        registerStep <
        registerCards.length - 1
    ) {

        registerStep++;

        showRegisterStep(registerStep);
    }

}


function previousRegisterStep() {

    if (registerStep > 0) {

        registerStep--;

        showRegisterStep(registerStep);
    }

}

/* =========================================================
   NUTRIBOT CHAT SYSTEM
========================================================= */

let currentChatId = null;


/* =========================================================
   ELEMENTS
========================================================= */

const nutriInput =
    document.getElementById("nutriInput");

const nutriMessages =
    document.getElementById("nutriMessages");

const sendButton =
    document.getElementById("sendButton");

const welcomeScreen =
    document.getElementById("welcomeScreen");

const historyPanel =
    document.getElementById("historyPanel");

const historyList =
    document.getElementById("historyList");


/*
 * Only run NutriBot code when we are actually
 * on the NutriBot page.
 */

if (
    nutriInput &&
    nutriMessages &&
    sendButton
) {


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeNutriHtml(text) {

        const div =
            document.createElement("div");

        div.textContent =
            text;

        return div.innerHTML;

    }


    /* =====================================================
       ADD BOT MESSAGE
    ===================================================== */

    function addBotMessage(message) {

        const welcome =
            document.getElementById(
                "welcomeScreen"
            );

        if (welcome) {
            welcome.remove();
        }


        const messageDiv =
            document.createElement("div");

        messageDiv.className =
            "chat-msg bot";


        messageDiv.innerHTML = `

            <div class="chat-avatar">
                🤖
            </div>

            <div>

                <div class="chat-bubble">
                    ${escapeNutriHtml(message)}
                </div>

            </div>

        `;


        nutriMessages.appendChild(
            messageDiv
        );


        nutriMessages.scrollTop =
            nutriMessages.scrollHeight;


        return messageDiv;

    }


    /* =====================================================
       ADD USER MESSAGE
    ===================================================== */

    function addUserMessage(message) {

        const welcome =
            document.getElementById(
                "welcomeScreen"
            );

        if (welcome) {
            welcome.remove();
        }


        const messageDiv =
            document.createElement("div");

        messageDiv.className =
            "chat-msg user";


        messageDiv.innerHTML = `

            <div>

                <div class="chat-bubble">
                    ${escapeNutriHtml(message)}
                </div>

            </div>

            <div class="chat-avatar">
                👤
            </div>

        `;


        nutriMessages.appendChild(
            messageDiv
        );


        nutriMessages.scrollTop =
            nutriMessages.scrollHeight;


        return messageDiv;

    }


    /* =====================================================
       SEND MESSAGE
    ===================================================== */

    window.sendMessage = async function() {

        const message =
            nutriInput.value.trim();


        if (!message) {
            return;
        }


        /*
         * If no chat exists yet,
         * automatically create one.
         */

        if (!currentChatId) {

            try {

                const newChatResponse =
                    await fetch(
                        "/new-chat",
                        {
                            method: "POST"
                        }
                    );


                const newChatData =
                    await newChatResponse.json();


                if (!newChatData.success) {

                    addBotMessage(
                        newChatData.error ||
                        "Unable to start a new chat."
                    );

                    return;

                }


                currentChatId =
                    newChatData.session_id;


                nutriMessages.innerHTML = "";


                /*
                 * Every new chat gets a greeting.
                 */

                addBotMessage(
                    newChatData.greeting
                );


                await loadChatHistoryList();

            }

            catch (error) {

                console.error(
                    "New chat error:",
                    error
                );

                addBotMessage(
                    "Unable to start a new chat."
                );

                return;

            }

        }


        /*
         * Display user message immediately.
         */

        addUserMessage(message);


        nutriInput.value = "";

        nutriInput.style.height =
            "auto";


        sendButton.disabled =
            true;

        sendButton.textContent =
            "…";


        /*
         * Show typing indicator.
         */

        const typingMessage =
            addBotMessage(
                "NutriBot is thinking..."
            );


        typingMessage.classList.add(
            "typing"
        );


        try {

            const response =
                await fetch(
                    "/chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            message:
                                message,

                            session_id:
                                currentChatId

                        })

                    }
                );


            const data =
                await response.json();


            typingMessage.remove();


            addBotMessage(
                data.reply ||
                "Sorry, I couldn't process that."
            );


            /*
             * Refresh history because the
             * conversation may have received
             * a new title.
             */

            await loadChatHistoryList();

        }

        catch (error) {

            console.error(
                "NutriBot error:",
                error
            );


            typingMessage.remove();


            addBotMessage(
                "Sorry, something went wrong while connecting to NutriBot."
            );

        }


        sendButton.disabled =
            false;

        sendButton.textContent =
            "↑";


        nutriInput.focus();

    };


    /* =====================================================
       QUICK MESSAGE
    ===================================================== */

    window.quickMsg = function(message) {

        nutriInput.value =
            message;

        sendMessage();

    };


    /* =====================================================
       NEW CHAT
    ===================================================== */

    window.startNewChat = async function() {

        try {

            const response =
                await fetch(
                    "/new-chat",
                    {
                        method: "POST"
                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                addBotMessage(
                    data.error ||
                    "Unable to create a new chat."
                );

                return;

            }


            currentChatId =
                data.session_id;


            /*
             * Clear current conversation.
             */

            nutriMessages.innerHTML = "";


            /*
             * New chat ALWAYS gets
             * a greeting.
             */

            addBotMessage(
                data.greeting
            );


            await loadChatHistoryList();


            if (historyPanel) {

                historyPanel.classList.remove(
                    "open"
                );

            }

        }

        catch (error) {

            console.error(
                "New chat error:",
                error
            );

        }

    };


    /* =====================================================
       LOAD CHAT LIST
    ===================================================== */

    async function loadChatHistoryList() {

        try {

            const response =
                await fetch(
                    "/chat-history"
                );


            const data =
                await response.json();


            if (!data.success) {
                return;
            }


            historyList.innerHTML = "";


            if (
                !data.chats ||
                data.chats.length === 0
            ) {

                historyList.innerHTML = `

                    <div class="history-empty">
                        No conversations yet.
                    </div>

                `;

                return;

            }


            data.chats.forEach(
                chat => {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.className =
                        "history-item";


                    const title =
                        document.createElement(
                            "span"
                        );


                    title.className =
                        "history-item-title";


                    title.textContent =
                        chat.title ||
                        "New Chat";


                    const date =
                        document.createElement(
                            "span"
                        );


                    date.className =
                        "history-item-date";


                    date.textContent =
                        formatChatDate(
                            chat.created_at
                        );


                    button.appendChild(
                        title
                    );


                    button.appendChild(
                        date
                    );


                    button.onclick =
                        function() {

                            loadChat(
                                chat.id
                            );

                        };


                    historyList.appendChild(
                        button
                    );

                }
            );

        }

        catch (error) {

            console.error(
                "History error:",
                error
            );

        }

    }


    /* =====================================================
       LOAD ONE CHAT
    ===================================================== */

    async function loadChat(chatId) {

        try {

            const response =
                await fetch(
                    `/chat-history/${chatId}`
                );


            const data =
                await response.json();


            if (!data.success) {

                addBotMessage(
                    data.error ||
                    "Unable to load this chat."
                );

                return;

            }


            currentChatId =
                chatId;


            nutriMessages.innerHTML =
                "";


            data.messages.forEach(
                message => {

                    if (
                        message.role ===
                        "assistant"
                    ) {

                        addBotMessage(
                            message.message
                        );

                    }
                    else {

                        addUserMessage(
                            message.message
                        );

                    }

                }
            );


            nutriMessages.scrollTop =
                nutriMessages.scrollHeight;


            if (historyPanel) {

                historyPanel.classList.remove(
                    "open"
                );

            }

        }

        catch (error) {

            console.error(
                "Load chat error:",
                error
            );

        }

    }


    /* =====================================================
       HISTORY TOGGLE
    ===================================================== */

    window.toggleHistory = function() {

        if (!historyPanel) {
            return;
        }


        historyPanel.classList.toggle(
            "open"
        );

    };


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatChatDate(dateString) {

        if (!dateString) {
            return "";
        }


        const date =
            new Date(
                dateString.replace(
                    " ",
                    "T"
                )
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        return date.toLocaleDateString(
            [],
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );

    }


    /* =====================================================
       AUTO RESIZE INPUT
    ===================================================== */

    nutriInput.addEventListener(
        "input",
        function() {

            this.style.height =
                "auto";


            this.style.height =
                Math.min(
                    this.scrollHeight,
                    130
                ) + "px";

        }
    );


    /* =====================================================
       ENTER TO SEND
    ===================================================== */

    nutriInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );


    /* =====================================================
       CLOSE HISTORY WHEN CLICKING OUTSIDE
    ===================================================== */

    document.addEventListener(
        "click",
        function(event) {

            const wrapper =
                document.querySelector(
                    ".history-wrapper"
                );


            if (
                wrapper &&
                !wrapper.contains(
                    event.target
                )
            ) {

                if (historyPanel) {

                    historyPanel.classList.remove(
                        "open"
                    );

                }

            }

        }
    );


    /* =====================================================
       LOAD HISTORY WHEN PAGE OPENS
    ===================================================== */

    loadChatHistoryList();

}
