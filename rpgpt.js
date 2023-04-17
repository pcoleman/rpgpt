$(document).ready(function() {
    var sessionArray = JSON.parse(localStorage.getItem("sessions"));
    var sessionSelect = document.querySelector('#session-selection');
    
    for (i in sessionArray) {
        let newSession = document.createElement('option');
        newSession.text = newSession.value = sessionArray[i];
        sessionSelect.add(newSession);
    }
    
    var sessionName = localStorage.getItem("currentSession");
    
    if (sessionName) {
        changeSession(sessionName);
    }
    
    $("#session-selection").change(function () {
        if (this.value) {
            changeSession(this.value);
        }
    });
		
    $( "#session-creation-save-button" ).click(saveSession);
    
    $( "#session-removal-button" ).click(removeSession);
    
    $( "#new-character-button" ).click(function(){
      var sessionName = localStorage.getItem("currentSession");
      localStorage.setItem(sessionName + ".player-creation-stage", 0);
      localStorage.removeItem(sessionName + ".player-creation-decisions");
      initializeNewCharacterCreation(sessionName);
    });
    
    $( "#new-player-submit-button" ).click(nextPlayerCreationStage);
    
    //$( "#new-character-button" ).click(initializeNewCharacterCreation);

});

function saveSession() {
  // Grabbing all the values from the text fields
	var sessionName = document.querySelector('#session-creation-name').value;
  if (!sessionName) {
      return;
  }
  
  var sessionDescription = document.querySelector('#session-creation-description').value;
  var sessionMechanics = document.querySelector('#session-creation-mechanics').value;
  var sessionSetting = document.querySelector('#session-creation-setting').value;
  var sessionCampaign = document.querySelector('#session-creation-campaign').value;
 
  // Creating the Session Object
  var sessionObject = {};
 
  sessionObject.name = sessionName;
  if (sessionDescription) {
    sessionObject.description = sessionDescription;
  }
  
  
  // Saving the text fields to Local Storage
  localStorage.setItem(sessionName, JSON.stringify(sessionObject));
  
  if (sessionMechanics) {
  	localStorage.setItem(sessionName+".mechanics", sessionMechanics);
  }
  
  if (sessionSetting) {
  	localStorage.setItem(sessionName+".setting", sessionSetting);
  }
  
  if (sessionCampaign) {
  	localStorage.setItem(sessionName+".campaign", sessionCampaign);
  }
  
  // Adding session the the list of sessions
  var sessionArrayString = localStorage.getItem("sessions");
  
  if (sessionArrayString) {
    var sessionArray = JSON.parse(sessionArrayString);
    sessionArray.push(sessionName);
  } else {
    var sessionArray = [sessionName];
  }
  
  localStorage.setItem("sessions", JSON.stringify(sessionArray));
  
  localStorage.setItem("currentSession", sessionName);
  
  // Clearing out text fields
  document.querySelector('#session-creation-name').value = "";
  document.querySelector('#session-creation-description').value = "";
  document.querySelector('#session-creation-mechanics').value = "";
  document.querySelector('#session-creation-setting').value = "";
  document.querySelector('#session-creation-campaign').value = "";
  
  // Adding session to drop down list
  var sessionSelect = document.querySelector('#session-selection');
  var newSession = document.createElement('option');
  newSession.text = newSession.value = sessionName;
  sessionSelect.add(newSession);
  sessionSelect.value = sessionName
  
   // Clearing out text fields
  var tempSession = localStorage.getItem(sessionName);
  var tempMechanics = localStorage.getItem(sessionName+".mechanics");
  var tempSetting = localStorage.getItem(sessionName+".setting");
  var tempCampaign = localStorage.getItem(sessionName+".campaign");
  var tempArray = localStorage.getItem("sessions");

  console.log("out: "+ tempSession);
  console.log("out: "+ tempMechanics);
  console.log("out: "+ tempSetting);
  console.log("out: "+ tempCampaign);
  console.log("out: "+ tempArray);
  
  initializeNewCharacterCreation(sessionName);
}


function removeSession() {
  var sessionSelect = document.querySelector('#session-selection');
  var sessionName = sessionSelect.value;
  var arr = []; // Array to hold the keys
  
  // Iterate over localStorage and insert the keys that meet the condition into arr
  for (var i = 0; i < localStorage.length; i++){
    if (localStorage.key(i).includes(sessionName)) {
      arr.push(localStorage.key(i));
    }
  }

  // Iterate over arr and remove the items by key
  for (var i = 0; i < arr.length; i++) {
    localStorage.removeItem(arr[i]);
  }
  
  // Remove the session from the drop down
  $("#session-selection option[value='" + sessionName + "']").remove();
  
  // Remove from the session array
  var sessionArray = JSON.parse(localStorage.getItem("sessions"));
  
  const index = sessionArray.indexOf(sessionName);
  
  const x = sessionArray.splice(index, 1);
  
  localStorage.setItem("sessions", JSON.stringify(sessionArray));
  
  var focusedSession = sessionSelect.value;
  changeSession(focusedSession);
  localStorage.setItem("currentSession", focusedSession);
  
  // Clearing out text fields
  var tempSession = localStorage.getItem(sessionName);
  var tempMechanics = localStorage.getItem(sessionName+".mechanics");
  var tempSetting = localStorage.getItem(sessionName+".setting");
  var tempCampaign = localStorage.getItem(sessionName+".campaign");
  var tempArray = localStorage.getItem("sessions");

  console.log("out: "+ tempSession);
  console.log("out: "+ tempMechanics);
  console.log("out: "+ tempSetting);
  console.log("out: "+ tempCampaign);
  console.log("out: "+ tempArray);
}

function changeSession(sessionName) {
   // Change the dropdown menu to the selected session
   var sessionSelect = document.querySelector('#session-selection');
   sessionSelect.value = sessionName
   
   // Initialize player creation for the session
   initializeNewCharacterCreation(sessionName);
}

function initializeNewCharacterCreation(sessionName) {
  var characterCreationSteps = localStorage.getItem(sessionName + ".character-creation-steps");
  if (!characterCreationSteps) {
     var setting = localStorage.getItem(sessionName + ".setting");
     var mechanics = localStorage.getItem(sessionName + ".mechanics");
     var messages = [{"role":"user", "content": "For the " + setting + " setting using the " + mechanics + " rule set, list out succinctly the steps for character creation, format it as a JSON array of strings, no new lines"}];
     prompt(messages, function(msg){
            console.log(msg);
            var characterCreationSteps = JSON.parse(msg.choices[0].message.content);
            console.log(characterCreationSteps);
            localStorage.setItem(sessionName + ".character-creation-steps", JSON.stringify(characterCreationSteps));
            var firstStep = characterCreationSteps[0];
            var firstStepMessage = [{"role":"user", "content": "Provide a detailed description of the first step of character creation, " + firstStep + ", using the " + mechanics + " in the " + setting + " setting. Provide a description of the options. Format everything using html code."}];
            prompt(firstStepMessage, function(msg) {
              var firstStep = msg.choices[0].message.content;
              console.log(firstStep);
              localStorage.setItem(sessionName + ".character-creation-first-step", firstStep);
              $("#new-player-text").html(firstStep);
            });
     });
  } else {
    var firstStep = localStorage.getItem(sessionName + ".character-creation-first-step");
    $("#new-player-text").html(firstStep);
  }
}

function nextPlayerCreationStage() {
  var sessionName = localStorage.getItem("currentSession");

  var setting = localStorage.getItem(sessionName + ".setting");
  var mechanics = localStorage.getItem(sessionName + ".mechanics");

  // Get the current player creation stage
  var stage = Number(localStorage.getItem(sessionName + ".player-creation-stage"));
  
  // Increment the stage to pull in the prompt for the second stage.
  stage = stage + 1;
  
  var character_creation_steps = JSON.parse(localStorage.getItem(sessionName + ".character-creation-steps"));

  console.log(JSON.stringify(character_creation_steps));
  console.log(stage);
  console.log(character_creation_steps.length);

  // Only do something if we haven't reached the end of the stages.
  if (stage <= character_creation_steps.length) {
  
    // Save the new stage number
    localStorage.setItem(sessionName + ".player-creation-stage", stage);
  
    // Get the stage text for the next stage
    var stageText = character_creation_steps[stage];
    
    // Get the decisions made so far during player creation
    var characterDecisions = localStorage.getItem(sessionName + ".player-creation-decisions");
    
    // Get the decision that was just made
    var input = document.querySelector('#character-creation-text').value;
	  
    // Set the input to empty for the next stage
    document.querySelector('#character-creation-text').value = "";
    
    // Add that decision to the array
    if (!characterDecisions) {
      characterDecisions = [input];
    } else {
      characterDecisions = JSON.parse(characterDecisions);
      characterDecisions.push(input);
    }
    
    //save the update character decision array
    localStorage.setItem(sessionName + ".player-creation-decisions", JSON.stringify(characterDecisions));
    
    // Append all the decisions so far
    var characterString = characterDecisions.join();
    
    // Create new message to send to chatGPT
    var message = [{"role":"user", "content": "Here are the choices I've made so far: " + characterString + ". Provide a detailed description of this next step of character creation: " + stageText + ", using the " + mechanics + " rules in the " + setting + " setting. Provide a description of the options. Format everything using html code."}];
    
    console.log(JSON.stringify(message));
    // Send prompt
    prompt(message, function(msg) {
      var nextStep = msg.choices[0].message.content;
      console.log(JSON.stringify(msg));
      console.log(nextStep);
      
      $("#new-player-text").html(nextStep);
    });
  }
}

function prompt(messages, successMethod) {
  var token = localStorage.getItem("openai-key");
  $.ajax({
    url: 'https://api.openai.com/v1/chat/completions',
    type: 'POST',
    data: JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": messages
    }),
    headers: {
        "Authorization": 'Bearer ' + token,
        "Content-Type": "application/json"
    },
    dataType: 'json',
    success: successMethod,
    error: function(xhr, textStatus, errorThrown) {
        alert(xhr.responseText);
    }
  });
}
