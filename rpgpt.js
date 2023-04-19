$(document).ready(function() {
    // Disable pressing enter on text boxes
    $(window).keydown(function(event){
      if(event.keyCode == 13) {
        event.preventDefault();
        return false;
      }
    });
	
    // load session array
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
	
    // load player array
   
    var playerArray = JSON.parse(localStorage.getItem(sessionName + ".player-characters"));
    var playerList = $("#player-list")
    
    for (i in playerArray) {
	var player = createPlayerElement(playerArray[i]);
	playerList.append(player);
    }
	
    // Select the current player
    var currentPlayerName = localStorage.getItem(sessionName + ".current-player");

    if (currentPlayerName) {
    	changePlayer(currentPlayerName);
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
      $( "#new-player-submit-button" ).show();
      $( "#new-player-save-button" ).hide(); 
      initializeNewCharacterCreation(sessionName);
    });
    
    $( "#new-player-submit-button" ).click(nextPlayerCreationStage);
    
    $( "#new-player-save-button" ).click(saveNewPlayer(sessionName));

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
   // Check to make sure sessionName is not empty
   if (sessionName) {
     // Change the dropdown menu to the selected session
     var sessionSelect = document.querySelector('#session-selection');
     sessionSelect.value = sessionName
   
     // Initialize player creation for the session
     initializeNewCharacterCreation(sessionName);
   }
	
   // Update the player list
   $("#player-list").empty();
    var playerArray = JSON.parse(localStorage.getItem(sessionName + ".player-characters"));
    var playerList = $("#player-list")
    
    for (i in playerArray) {
	var player = createPlayerElement(playerArray[i]);
	playerList.append(player);
    }
	
    // Select the current player
    var currentPlayerName = localStorage.getItem(sessionName + ".current-player");

    if (currentPlayerName) {
    	changePlayer(currentPlayerName);
    }
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
  if (stage <= character_creation_steps.length + 2) {
  
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
      characterDecisions = ["1st level", input];
    } else {
      console.log(characterDecisions);
      characterDecisions = JSON.parse(characterDecisions);
      characterDecisions.push(input);
    }
    
    //save the update character decision array
    localStorage.setItem(sessionName + ".player-creation-decisions", JSON.stringify(characterDecisions));
	  
    if (stage < character_creation_steps.length) {
	    // Append all the decisions so far
	    var characterString = characterDecisions.join();

	    // Create new message to send to chatGPT
	    var message = [{"role":"user", "content": "I am " + characterString + ". With that in mind, provide a detailed description of this next step of character creation: " + stageText + ", using the " + mechanics + " rules in the " + setting + " setting. Provide a description of the options. Format everything using html code."}];

	    console.log(JSON.stringify(message));
	    // Send prompt
	    prompt(message, function(msg) {
	      var nextStep = msg.choices[0].message.content;
	      console.log(JSON.stringify(msg));
	      console.log(nextStep);

	      $("#new-player-text").html(nextStep);
	    });
    } else if (stage == character_creation_steps.length){
	   $("#new-player-text").html("<h2>What is your character's name?</h2>"); 
    } else if (stage == (character_creation_steps.length + 1 )) {
	   // Save the character name in a temporary variable
	   localStorage.setItem(sessionName + ".player-creation-name", input);
           $("#new-player-text").html("<h2>What is your character's background?</h2>"); 
    } else {
	   // Save the character background in a temporary variable
	   localStorage.setItem(sessionName + ".player-creation-background", input);
	    
	    // Append all the decisions so far
	    var characterString = characterDecisions.join();
	    
	    console.log(characterString);
	    // Create new message to send to chatGPT
	    var message = [{"role":"user", "content": "create a " + mechanics + " character sheet for: " + characterString + ". Provide counts for inventory items. Include the number of expendable slots, for example spell slots or skills that have a limited number of uses. Include other features or attributes commonly associated with this type of character that was not listed above, assign values to these."}];
            prompt(message, function(msg) {
	      var characterSheet = msg.choices[0].message.content;
	      console.log(JSON.stringify(msg));
	      console.log(characterSheet);
		    
	      var csmessage = [{"role":"user", "content": "convert this character sheet to a JSON object: " + characterSheet}];
            
	      prompt(csmessage, function(msg) {
	      	var characterSheet = msg.choices[0].message.content;
	      	console.log(JSON.stringify(msg));
	      	console.log(characterSheet);
		
		      
		$("#new-player-text").html(characterSheet);
                // Save the player JSON
                localStorage.setItem(sessionName + ".player-creation-json", characterSheet);
		      
		$( "#new-player-submit-button" ).hide();
		$( "#new-player-save-button" ).show();      
	    });
	 });
    }
  } 
}

function saveNewPlayer(sessionName) {
	// Get all the information about the player character
	var name = localStorage.getItem(sessionName + ".player-creation-name");
	var background = localStorage.getItem(sessionName + ".player-creation-background");
	var json = localStorage.getItem(sessionName + ".player-creation-json");
	
	// Create the player character object
	var playerObject = {"background":background, "json":JSON.parse(json)};
	
	// Save the player character object
	localStorage.setItem(sessionName + "." + name, JSON.stringify(playerObject));
	
	// Add the player character to the list of available player characters
	var playerCharacters = localStorage.getItem(sessionName + ".player-characters");
	
	if (!playerCharacters) {
		playerCharacters = [name];	
	} else {
		playerCharacters = JSON.parse(playerCharacters);
		playerCharacters.push(name);
	}
	
	// Save the new list of player characters
	localStorage.setItem(sessionName + ".player-characters", JSON.stringify(playerCharacters));
	
	// Set the new player as the current player
	localStorage.setItem(sessionName + ".current-player", name);
	
	// Create a new player element to add to the list on the site
	var player = createPlayerElement(sessionName, name);
	
	$("#player-list").append(player);
	
	// Update everything with the newly selected character.
	changePlayer(name);
}

function createPlayerElement(sessionName, name) {
        return "<li class=\"player-container player-selected\" onclick=\"changePlayer(" + name + ")\" id=\"" + name + "-list-item\"><h5>Player Name</h5><div class=\"player-edit-buttons wf-section\" hidden id=\""+ name + "-edit-buttons\"><div class=\"player-edit-button\" onclick=\"editPlayer(" + sessionName + "," + name + ")\"></div><div class=\"player-remove-button\" onclick=\"removePlayer(" + sessionName + "," + name + ")\"></div></div></li>"
}

function changePlayer(playerName) {
	var playerList = $("#player-list li");
	playerList.each(function(idx, li) {
    		var player = $(li);
                player.removeClass("player-container player-selected");
		player.addClass("player-container");
		player.find(".player-edit-buttons").hide();
	});
	$("#" + playerName + "-list-item").removeClass("player-container");
	$("#" + playerName + "-list-item").addClass("player-container player-selected");
	$("#" + playerName + "-edit-buttons").show();
	
}

function removePlayer(sessionName, playerName) {
	// Add the player character to the list of available player characters
	var playerCharacters = JSON.parse(localStorage.getItem(sessionName + ".player-characters"));
	playerCharacters.splice(playerCharacters.indexOf(playerName), 1);
	localStorage.setItem(sessionName + ".player-characters", JSON.stringify(playerCharacters));

	// Remove player from the list on the page
	var playerList = document.getElementById("player-list");
	var playerElement = document.getElementById(playerName + "-list-item");
	playerList.removeChild(playerElement);
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
