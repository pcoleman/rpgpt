let currentPlayerTree = null;

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
	
    // Load Log
    var log  = localStorage.getItem(sessionName+".log");
    
    if (log) {
		$( "#text-response-field" ).html(log);
	    	$( "#text-submit-area" ).show();
		$( "#text-submit-button" ).show();
		$( "#start-adventure-button" ).hide();
    }
	
    // Load last turn
    var lastTurn  = localStorage.getItem(sessionName+".last-turn");
	
	if (lastTurn) {
		var lastTurnObject = JSON.parse(lastTurn);
		$( "#turn-number" ).text(lastTurnObject["turn"]);
		$( "#location-field" ).text(lastTurnObject["location"]);
		$( "#description-field" ).html(lastTurn["description"]);
    	}
    
    $( "#new-player-submit-button" ).click(nextPlayerCreationStage);
    
    $( "#new-player-save-button" ).click({session: sessionName}, saveNewPlayer);
	
	$( "#player-removal-confirmation" ).click(removePlayerButton);
	
	$( "#player-edit-confirmation" ).click(editPlayerButton);
	
	$( "#start-adventure-button" ).click(startAdventure);
	
	$( "#text-submit-button" ).click(submitAction);
});

function startAdventure(event) {
	var sessionName = localStorage.getItem("currentSession");
	var playerName = localStorage.getItem(sessionName + ".current-player");
	localStorage.setItem(sessionName + ".hot-summary", "");
	
	var message = craftMessage(sessionName, playerName, "introduce the game, it will be written as narrator of a story. This introduction will consist of the following parts, an overview of the game world and setting, an introduction to the main character, an original expository event that starts the story off.");
	
	console.log(JSON.stringify(message));

        prompt(message, function(msg) {
	      var response = msg.choices[0].message.content;
	      processResponse(sessionName, response);
	      console.log(JSON.stringify(msg));
		$( "#text-submit-area" ).show();
		$( "#text-submit-button" ).show();
		$( "#start-adventure-button" ).hide();
	    });
}


function submitAction(event) {
	var sessionName = localStorage.getItem("currentSession");
	var playerName = localStorage.getItem(sessionName + ".current-player");
	var action = document.querySelector('#text-submit-area').value;
	document.querySelector('#text-submit-area').value = "";
	
	console.log(action);
	
	var message = craftMessage(sessionName, playerName, action);
	
	console.log(JSON.stringify(message));

        prompt(message, function(msg) {
	      var response = msg.choices[0].message.content;
	      processResponse(sessionName, response);
	      console.log(JSON.stringify(msg));
	    });
}

function craftMessage(sessionName, playerName, message) {
	var sessionName = localStorage.getItem("currentSession");
	var playerName = localStorage.getItem(sessionName + ".current-player");
	var playerObject = JSON.parse(localStorage.getItem(sessionName + "." + playerName));
	console.log(sessionName + ".hot-summary");
	var hotSummary = localStorage.getItem(sessionName + ".hot-summary");
	console.log(playerObject);
	var mechanics = localStorage.getItem(sessionName+".mechanics");
	var setting = "The setting for this role playing game is " + localStorage.getItem(sessionName+".setting");
	var character = "My character is " + playerName + "." + playerObject.background + ". This is my character sheet: " + JSON.stringify(playerObject.json);
	var summary = "These are the events that have happened so far in the game: " + hotSummary;
	var lastTurn =  "This was the last turn in the game: " + localStorage.getItem(sessionName+".last-turn");
	var gamePrompt = "You are a game master running a game using the rules of " + mechanics + "\n\nThis is a JSON template for the game output:\n{\n\"turn_number\": <TURN>,\n\"roll\" <ROLL>,\"player\": <PLAYER>,\n\"location\":  <LOCATION>,\n\"story\": <STORY>,\n\"description\", <DESCRIPTION>,\n\"summary\": <SUMMARY>,\n\"location_interations\": <LOCATION_INTERACTIONS>,\n\"npc_interactions\": <NPC_INTERACIONS>,\n\"points_of_interest\": <POI>\n}\n\nIn the template above items in angles brackets represent tokens that will be replaced by text and should not be displayed. Match the token with the specifications below:\n• <TURN>\n		○ The current turn number. Increment it each turn.\n    • <ROLL>\n		○ Any dice rolls that were required to resolve an action. Return a null if no dice rolls were done\n	• <PLAYER>\n		○ A JSON object representing the changes made to the previously provided players character sheet, for example if the player had 10 health and lost 2 the object would be {\"hit points\": 8}. If there have been no changes return a null \n	• <LOCATION>\n		○ The current location as understood by the main character.\n	• <DESCRIPTION>\n		○ An array containing descriptions of the appearance of the <LOCATION>, and the appearance of any NPCs, this should not contain any actions relevant to the story e.g. [\"the coobles stone streets are filled with shops\"]\n	• <STORY>\n		○ A description of the results of my last action using one or more paragraphs. It will use a Erin Morgenstern-esque second person, present tense writing style.\n			  * <SUMMARY>\n    ○ A concise minmimal third person, summary of <STORY>, the player character should be referred to by name.\n  * <LOCATION_INTERACIONS>\n    ○ A JSON object that looks like this\n{<The Name of the location>: [<An array of summaries of the players interactions with the location}]\n  * <NPC_INTERACTIONS>\n    ○ A JSON array that looks like this\n[{\"name\": <The Name of the NPC>, \"interaction\": [<A summary of the players interaction with the NPC}] \n  * <POI>\n    ○ A JSON array that contains the names of at least 3 nearby locations, looks like [\"location1\", \"location2\", \"location3\"]\n\nThere are some special commands I can issue. These result of the command will replace [story] in the game output. The special commands are issued with one of the words below and has the listed result.\n	• hint\n		○ You will give a small hint to point me an interesting direction for the story.\n\nThe following rules are central to the game logic and must always be followed:\n	1. Use the rules for " + mechanics + "\n        1. After you output the template, that ends one turn. Wait for my response to start the next turn.  2. The output should always be valid JSON and nothing else\n\n\nSettings: " + setting + "\nPlayer:" + playerName;
	var userMessage = gamePrompt + ", Action: " + message;
	
	return [{"role":"system", "content": "You are a game master using the " + mechanics + " rules, all of your responses are formatted as JSON"},{"role":"assistant", "content": setting}, {"role":"assistant", "content": character}, {"role":"assistant", "content": summary}, {"role":"assistant", "content": lastLine}, {"role":"user", "content": userMessage}];
}

function processResponse(sessionName, message) {
	console.log("processing response");
	console.log(message);
	var response = JSON.parse(message);
	console.log(response);
	// initialize the last turn object
	var lastTurn = {};
	
	// Pull out the turn number
	var turnNumber = response["turn_number"];
	console.log("turn: " + turnNumber);
	if (turnNumber) {
		$( "#turn-number" ).text(turnNumber);
		
		// Add turn number to the last turn object
		lastTurn["turn"] = turnNumber;
	}
	
	// Pull out the location
	var location = response["location"];
	console.log("location: " + location);
	if (location) {
		$( "#location-field" ).text(location);
		
		// Add location to the last turn object
		lastTurn["location"] = location;
	}
	
        var description = response["description"];
	console.log("description: " + description);
	if (description) {
		var descriptionsCombined = description.join('<br><br>');
		$( "#description-field" ).html(descriptionsCombined);
		
		// Add description to the last turn
		lastTurn["description"] = descriptionsCombined;
	}
	
	var poi = response["points_of_interest"];
	console.log("poi: " + poi);
	if (poi) {
		var poilocations = poi.join('<br>');
		$( "#poi-field" ).html(poilocations);
	}
	
	var summary = response["summary"];
	console.log("summary: " + summary);
	if (summary) {
		var hotsummary = localStorage.getItem(sessionName + ".hot-summary");
		hotsummary = hotsummary + summary;
		localStorage.setItem(sessionName + ".hot-summary", hotsummary);
	}
	
	var mainResponse = ""
	var roll = response["roll"];
	console.log("roll: " + roll);
	if (roll) {
		mainResponse = mainResponse + "<br><br>Roll: " + roll;	
	}
	
	var story = response["story"];
	console.log("story: " + story);
	if (story) {
		mainResponse = mainResponse + "<br><br>" + story;	
		
		// add story to the last turn object
		lastTurn["story"] = story;
		
		// Set the last turn
		localStorage.setItem(sessionName+".last-turn", JSON.stringify(lastTurn));
		
		// Set the running log
		var log = localStorage.getItem(sessionName+".log");
		if (!log) {
			log = mainResponse;
		} else {
			log = log + "<br><br>" + mainResponse;
		}
		
		localStorage.setItem(sessionName+".log", mainResponse);
	}
	
	if (mainResponse) {
		$( "#text-response-field" ).html(log);
	}
}

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
	console.log("changing session");
   // Check to make sure sessionName is not empty
   if (sessionName) {
     // Change the dropdown menu to the selected session
     var sessionSelect = document.querySelector('#session-selection');
     sessionSelect.value = sessionName
   
     // Initialize player creation for the session
     initializeNewCharacterCreation(sessionName);
   }

	console.log(sessionName);
   // Update the player list
   $("#player-list").empty();
    var playerArray = JSON.parse(localStorage.getItem(sessionName + ".player-characters"));
    var playerList = $("#player-list")
    
    for (i in playerArray) {
	console.log(JSON.stringify(playerArray));
	console.log(playerArray[i]);
	var player = createPlayerElement(sessionName, playerArray[i]);
	playerList.append(player);
    }
	
    // Select the current player
	console.log(sessionName + ".current-player");
    var currentPlayerName = localStorage.getItem(sessionName + ".current-player");
     console.log(currentPlayerName);
    if (currentPlayerName) {
	changePlayer({data:{sessionName:sessionName, playerName: currentPlayerName}});
    }
	
	prepAdventure(sessionName);
}

function prepAdventure(sessionName) {
	console.log("preparing adventure");
	var chatlog = localStorage.getItem(sessionName + ".chat-log");
	if (chatlog) {
		$( "#text-response-field" ).text(chatlog);
		$( "#text-submit-area" ).show();
		$( "#text-submit-button" ).show();
		$( "#start-adventure-button" ).hide();
	} else {
		$( "#text-submit-area" ).hide();
		$( "#text-submit-button" ).hide();
		$( "#start-adventure-button" ).show();
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
	console.log("next player creation stage");
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

function saveNewPlayer(event) {
	sessionName = event.data.session;
	console.log("saving new player");
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
	
	// Create a new player element to add to the list on the site
	var player = createPlayerElement(sessionName, name);
	
	$("#player-list").append(player);
	
	// Update everything with the newly selected character.
	changePlayer({data:{sessionName:sessionName, playerName: name}});
}

function createPlayerElement(sessionName, name) {
	var playerLi = $('<li></li>');
	playerLi.addClass("player-container");
	playerLi.click({sessionName: sessionName, playerName: name}, changePlayer);
	playerLi.attr({'id': name.replace(/\s+/g, '') + "-list-item"});
	
	var text = $('<h5></h5>');
	text.text(name);
	playerLi.append(text);
	
	var buttonContainer = $('<div></div>');
	buttonContainer.addClass("player-edit-buttons wf-section");
	buttonContainer.attr({'id': name.replace(/\s+/g, '') + "-edit-buttons"});
	
	var editButton = $('<a></a>');
	editButton.addClass("player-edit-button");
	editButton.attr({'id': name.replace(/\s+/g, '') + "-edit-button", "href":"#"});
	editButton.click({sessionName:sessionName, playerName: name}, editPlayer);
	buttonContainer.append(editButton);
	
	var removeButton = $('<a></a>');
	removeButton.addClass("player-remove-button");
	removeButton.click({sessionName:sessionName, playerName: name}, removePlayer);
	removeButton.attr({'id': name.replace(/\s+/g, '') + "-remove-button", "href":"#"});
	buttonContainer.append(removeButton);
	
	buttonContainer.hide();
	
	playerLi.append(buttonContainer);
	
	return playerLi;
}

function changePlayer(event) {
	var sessionName = event.data.sessionName;
	var playerName = event.data.playerName;
	console.log("changing players " + playerName + " " + sessionName);
	var playerList = $("#player-list li");
	playerList.each(function(idx, li) {
    		var player = $(li);
		player.off('click');
                player.removeClass("player-container player-selected");
		player.addClass("player-container");
		player.find(".player-edit-buttons").hide();
		var tempName = player.find('h5').text();
		player.click({sessionName: sessionName, playerName: tempName}, changePlayer);
	});
	var playerListItem = $("#" + playerName.replace(/\s+/g, '') + "-list-item");
	playerListItem.removeClass("player-container");
	playerListItem.addClass("player-container player-selected");
	playerListItem.off('click');
	
	var playerEditButtonContainer = $("#" + playerName.replace(/\s+/g, '') + "-edit-buttons");
	playerEditButtonContainer.show();
	
	// Set the new player as the current player
	localStorage.setItem(sessionName + ".current-player", playerName);
	
	// Enable the player tree
	var playerObject = JSON.parse(localStorage.getItem(sessionName + "." + playerName));
	
	// remove the current player tree
	if (currentPlayerTree) {
		jsonview.destroy(currentPlayerTree);	
	}
	
	// create json tree object
	var partyObject = {};
	partyObject[playerName] = playerObject.json;
	const tree = jsonview.create(partyObject);
	
	// render tree into dom element
	jsonview.render(tree, document.querySelector('#player-tree'));
	
	// set the new tree as the current player tree
	currentPlayerTree = tree;
}

function editPlayer(event) {
	var sessionName = event.data.sessionName;
	var playerName = event.data.playerName;
	localStorage.setItem(sessionName + ".editPlayer", playerName);
	
	// Populate the edit field
	var playerObject = JSON.parse(localStorage.getItem(sessionName + "." + playerName));
	
	var playerString = JSON.stringify(playerObject, null, 4);
	$("#player-edit-text-area").text(playerString);
	
	
	// Show player edit modal
	$("#player-edit-modal").show();
}

function removePlayer(event) {
	var sessionName = event.data.sessionName;
	var playerName = event.data.playerName;
	localStorage.setItem(sessionName + ".removePlayer", playerName);
	
	// Show player removal modal
	$("#player-removal-modal").show();
	$("#player-removal-modal").css('opacity', '1.0');
	
	$("#player-removal-form").show();
	$("#player-removal-form").css('opacity', '1.0');
	$("#player-removal-form").css('scale', '1.0');
}

function removePlayerButton() {
	var sessionName = localStorage.getItem("currentSession");
	var playerName = localStorage.getItem(sessionName + ".removePlayer");
	console.log("removing players");
	
	// Remove the player character from the list of available player characters
	var playerCharacters = JSON.parse(localStorage.getItem(sessionName + ".player-characters"));
	playerCharacters.splice(playerCharacters.indexOf(playerName), 1);
	localStorage.setItem(sessionName + ".player-characters", JSON.stringify(playerCharacters));
	
	// Remove the player objct
	localStorage.removeItem(sessionName + "." + playerName);

	// Remove player from the list on the page
	$("#" + playerName.replace(/\s+/g, '') + "-list-item").remove();
	
	// reset remove player field
	localStorage.setItem(sessionName + ".removePlayer", "");
}

function editPlayerButton() {
	var sessionName = localStorage.getItem("currentSession");
	var playerName = localStorage.getItem(sessionName + ".editPlayer");
	console.log("editing player " + playerName);
	
	// Get the modified player text
	var modifiedPlayer = $("#player-edit-text-area").val();
	
	var modifiedPlayerObject = JSON.parse(modifiedPlayer);
	
	// Save modified player
	localStorage.setItem(sessionName + "." + playerName, JSON.stringify(modifiedPlayerObject));
	
	changePlayer({data:{sessionName:sessionName, playerName: playerName}});
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
