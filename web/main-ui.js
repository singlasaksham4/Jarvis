// This function runs when the main_app.html body loads
function initMainApp() {
    // First, check if a user is logged in by looking in local storage
    const userName = localStorage.getItem('jarvis_user');
    
    // If there is no user name, they are not logged in. Redirect to the login page.
    if (!userName) {
        window.location.href = 'login.html';
        return; // Stop the rest of the script from running
    }

    // If we are here, the user is logged in. Show the UI and initialize everything.
    $('#jarvis-ui').show();
    
    // Initialize UI elements once the DOM is ready
    $(document).ready(function() {
        $('.text').textillate({ loop: true, sync: true, in: { effect: "bounceIn" }, out: { effect: "bounceOut" } });
        $('.siri-message').textillate({ loop: false, autoStart: false });

        // Speech Recognition Setup
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = "en-US";
            
            $("#MicBtn").click(() => {
                try {
                    recognition.start();
                } catch(e) {
                    console.error("Recognition already started.", e);
                }
            });

            recognition.onstart = () => {
                 $('.siri-message').text("Listening...").textillate('start');
                 $("#SiriWave").show();
                 $("#oval1").hide(); 
            };
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                processUserInput(transcript);
            };

            recognition.onerror = (event) => { 
                console.error("Speech recognition error", event.error);
                $("#SiriWave").hide();
                $("#oval1").show();
            };

            recognition.onend = () => {
                // Wait a moment before hiding the listening UI
                setTimeout(() => {
                    $("#SiriWave").hide();
                    $("#oval1").show();
                }, 800);
            }
        } else { 
            $("#MicBtn").hide(); 
            console.log("Speech Recognition not supported in this browser.");
        }

        // Text input handler for 'Enter' key
        $("#chatbox").on("keypress", function(event) {
            if (event.key === "Enter") { 
                processUserInput($(this).val()); 
                $(this).val(""); 
            }
        });

        // Initial welcome message for the logged-in user
        speak(`Welcome back, ${userName}. System is now online and ready for your command.`);
    });
}

// --- Core UI Functions ---

function speak(text) {
    // Stop any previous speech
    window.speechSynthesis.cancel();

    // Ensure the siri-message element is ready for animation
    $('.siri-message').text(text).textillate('start');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
        $("#SiriWave").show();
        $("#oval1").hide();
    };

    utterance.onend = () => {
        // Wait a moment before hiding the speaking UI
        setTimeout(() => {
            $("#SiriWave").hide();
            $("#oval1").show();
        }, 800);
    };

    window.speechSynthesis.speak(utterance);
}

function addMessageToChat(message, sender) {
    const chatHistory = $("#chat-history");
    const messageClass = sender === 'user' ? 'sender_message' : 'receiver_message';
    const justify = sender === 'user' ? 'justify-content-end' : 'justify-content-start';
    const messageElement = $(`<div class="d-flex ${justify} mb-3"></div>`).html(`<div class="${messageClass}">${message}</div>`);
    chatHistory.append(messageElement);
    // Scroll to the bottom of the chat history
    chatHistory.scrollTop(chatHistory[0].scrollHeight);
}

async function processUserInput(userInput) {
    userInput = userInput.trim();
    if (!userInput) return;

    addMessageToChat(userInput, 'user');
    
    // Call the Python backend to get a response
    const response = await eel.get_response(userInput)();
    
    // Speak the response and add it to the chat
    speak(response);
    addMessageToChat(response, 'jarvis');
}