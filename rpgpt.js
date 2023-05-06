let partyTrees = {};

$(document).ready(function() {
    // Disable pressing enter on text boxes
    $(window).keydown(function(event){
      if(event.keyCode == 13) {
        event.preventDefault();
        return false;
      }
    });
	
    // load session array
    var sessionArray = JSON.parse(get("", "sessions"));
    var sessionSelect = document.querySelector('#session-selection');
    
    for (i in sessionArray) {
        let newSession = document.createElement('option');
        newSession.text = newSession.value = sessionArray[i];
        sessionSelect.add(newSession);
    }
    
    var sessionName = get("", "currentSession");
    
    if (sessionName) {
        changeSession(sessionName);
	    
	    // Load Log
	    var log  = get(sessionName, "log");

	    if (log) {
			$( "#text-response-field" ).html(log);
			$( "#text-submit-area" ).show();
			$( "#text-submit-button" ).show();
			$( "#start-adventure-button" ).hide();
	    }

	    // Load last turn
	    var lastTurn  = get(sessionName, "last-turn");

		if (lastTurn) {
			var lastTurnObject = JSON.parse(lastTurn);
			$( "#turn-number" ).text(lastTurnObject["turn"]);
			$( "#location-field" ).text(lastTurnObject["location"]);
			$( "#description-field" ).html(lastTurn["description"]);
		}
    }
    
    $("#session-selection").change(function () {
        if (this.value) {
            changeSession(this.value);
        }
    });
		
    $( "#session-creation-save-button" ).click(saveSession);
    
    $( "#session-removal-button" ).click(removeSession);
    
    $( "#new-character-button" ).click(function(){
      var sessionName = get("", "currentSession");
      set(sessionName, "player-creation-stage", 0);
      remove(sessionName, "player-creation-decisions");
      $( "#new-player-submit-button" ).show();
      $( "#new-player-save-button" ).hide(); 
      initializeNewCharacterCreation(sessionName);
    });
    
    $( "#new-player-submit-button" ).click(nextPlayerCreationStage);
    
    $( "#new-player-save-button" ).click({session: sessionName}, saveNewPlayer);
	
	$( "#player-removal-confirmation" ).click(removePlayerButton);
	
	$( "#player-edit-confirmation" ).click(editPlayerButton);
	
	$( "#start-adventure-button" ).click(startAdventure);
	
	$( "#text-submit-button" ).click(submitAction);
	
	$( "#import-button" ).click({session: sessionName}, selectImportFiles);
});

    /**
     * Extract text from PDFs with PDF.js 
     * Uses the demo pdf.js from https://mozilla.github.io/pdf.js/getting_started/
     */
    function pdfToText(data) {
	    
	var loadingTask = pdfjsLib.getDocument(data);
	return  loadingTask.promise.then(function(pdf) { // get all pages text
	   console.log(pdf.numPages);
	    var maxPages = pdf.numPages;
	    var countPromises = []; // collecting all page promises
	    for (var j = 1; j <= maxPages; j++) {
	      var page = pdf.getPage(j);

	      var txt = "";
	      countPromises.push(page.then(function(page) { // add page promise
		var textContent = page.getTextContent();
		return textContent.then(function(text){ // return content promise
		  return text.items.map(function (s) { return s.str; }).join(' '); // value page text 
		});
	      }));
	    }
	    // Wait for all pages and join text
	    return Promise.all(countPromises).then(function (texts) {
	      return texts.join(' ');
	    });
	 });
    }

function selectImportFiles(event) {
	var sessionName = event.data.sessionName;
	var input = document.createElement('input');
	
	input.type = 'file';

	input.onchange = event => { 
	  var file = event.target.files[0];

	    //Step 2: Read the file using file reader
	    var fileReader = new FileReader();  

	    fileReader.onload = function() {

		//Step 4:turn array buffer into typed array
		var typedarray = new Uint8Array(this.result);

		//Step 5:pdfjs should be able to read this
		pdfToText(typedarray).then(processPDF);
	    };
	    //Step 3:Read the file as ArrayBuffer
	    fileReader.readAsArrayBuffer(file);

	}

	input.click();
}

async function processPDF(result) {
	var promptPromises = []; // collecting all prompt promises
	var pageSize = 5000
	var finalLength = result.length - pageSize - 1;

	var userMessage = "I want you to pull detailed information out of the passage below. Only output valid JSON and only include data that was specified in the passage below. This is a template for your response:{\"setting\": <setting>,\"locations\": <locations>,\"groups\": <groups>,\"races\": <races>,\"characters\": <characters>,\"events\": <events>,\"rules\":<rules>}, In the template above, items in angles brackets represent tokens that will be replaced by text and should not be displayed. Match the token with these specifications: <setting>: This should be a valid JSON object that looks like {\"name\": <name of the setting>, \"description\": <description of the setting>, \"history\":<history of the setting>}  <locations>: This should be a valid JSON array that looks like [{\"name\": <The name of the location>, \"description\": <A description of the location, including appearance, function and mood>, \"groups\": <a json array of strings containing the groups associated with the location>, \"characters\": <a json array of strings containing characters currently in this location>, \"history\": <any history of this specific location>, \"events\": <a json array of of objects that represent any campaign events that are suppose to happen when a player visits this location, and their requirements>, \"nearby-locations\": <a json array of strings containing any relevant nearby locations>}].   <groups>: This should be a valid JSON array that looks like [{\"name\": <the name of the group or organizaton>, \"description\": <a description of the group or organization>, \"history\": <a history of the group or organization>, \"notable-characters\": <a json array of string containing the names of notable characters related to this group>}].   <races>: This should be a valid JSON array that looks like [{\"name\": <The name of the race or species or creature>, \"description: <A description of the race>, \"appearance\": <Common defining features for appearance>, \"customs\": <a description of any customs specific to this race>}].  <characters>: This should be a valid JSON array that looks like [{\"name\":<The name of the character or person>, \"description\": <A description of the character or person>, \"history\": <A history of the character or person>, \"events\": <a json array of of objects that represent any campaign events that are suppose to happen when a player talks to this character or person, and their requirements>}].  <events>: These are events not tied to a location or character, This should be a valid JSON array that looks like [{\"event\": <the event that will happen>, \"condition\": <the required conditions necessary for the event to happen>}].   <rules>: This should be a JSON array that looks like [<A description of any rules or game mechanics>]";
	
	//var userMessage = "Create a detailed summary of the following passage, while maintaining any details about the setting, characters, location, groups, evets, or rules. Passage: ";
	for (let i = 0; i < finalLength; i += pageSize) {
		console.log(i + "/" + finalLength);
		var tempMessage = userMessage + "\n\n" + result.slice(i,(i + pageSize));
		var messages = [{"role":"user", "content": tempMessage}];

		await promptPromises.push(prompt(messages));
	}
	Promise.all(promptPromises).then(processBooks);
}
	
function createSummary(promptMessages) {
	for (const i in promptMessages) {
		console.log(promptMessages[i]);
	}
}
	
function processBooks(promptMessages) {
	var combinedObject = {"setting":[], "locations":[], "groups":[], "races":[], "characters":[], "events":[], "rules":[]};
	for (const i in promptMessages) {
		try {
		var parsedMsg = JSON.parse(promptMessages[i].trim());

		if ("setting" in parsedMsg) {
			var merged = false;
			var settingName = parsedMsg["setting"]["name"];
			for (const j in combinedObject["setting"]) {
				var combinedSetting = combinedObject["setting"][j];
				if (compareNames(settingName, combinedSetting["name"])) {
					combinedSetting["description"] = combinedSetting["description"] + parsedMsg["setting"]["description"];
					combinedSetting["history"] = combinedSetting["history"] + parsedMsg["setting"]["history"];
					merged = true;
				}
			}

			if (!merged) {
				combinedObject["setting"].push(parsedMsg["setting"]);
			}
		}

		if ("locations" in parsedMsg) {
			for (const j in parsedMsg["locations"]) {
				var parsedLocation = parsedMsg["locations"][j]
				var merged = false;
				var locationName = parsedLocation["name"];
				for (const k in combinedObject["locations"]) {
					var combinedLocation = combinedObject["locations"][k];
					if (compareNames(locationName, combinedLocation["name"])) {
						combinedLocation["description"] = combinedLocation["description"] + parsedLocation["description"];
						combinedLocation["history"] = combinedLocation["history"] + parsedLocation["history"];
						combinedLocation["groups"] = [...new Set(combinedLocation["groups"].concat(parsedLocation["groups"]))];
						combinedLocation["characters"] = [...new Set(combinedLocation["characters"].concat(parsedLocation["characters"]))];
						combinedLocation["events"] = [...new Set(combinedLocation["events"].concat(parsedLocation["events"]))];
						combinedLocation["nearby-locations"] = [...new Set(combinedLocation["nearby-locations"].concat(parsedLocation["nearby-locations"]))];
						merged = true;
					}
				}

				if (!merged) {
					combinedObject["locations"].push(parsedLocation);
				}
			}
		}

		if ("groups" in parsedMsg) {
			for (const j in parsedMsg["groups"]) {
				var parsedGroup = parsedMsg["groups"][j];
				var merged = false;

				var groupName = parsedGroup["name"];
				for (const k in combinedObject["groups"]) {
					var combinedGroup = combinedObject["groups"][k];
					if (compareNames(groupName, combinedGroup["name"])) {
						combinedGroup["description"] = combinedGroup["description"] + parsedGroup["description"];
						combinedGroup["history"] = combinedGroup["history"] + parsedGroup["history"];
						combinedGroup["notable-characters"] = [...new Set(combinedGroup["notable-characters"].concat(parsedGroup["notable-characters"]))];
						merged = true;
					}
				}

				if (!merged) {
					combinedObject["groups"].push(parsedGroup);
				}
			}
		}

		if ("races" in parsedMsg) {
			for (const j in parsedMsg["races"]) {
				var parsedRace = parsedMsg["races"][j];
				var merged = false;

				var raceName = parsedRace["name"];
				for (const k in combinedObject["races"]) {
					var combinedRace = combinedObject["races"][k];
					if (compareNames(raceName, combinedRace["name"])) {
						combinedRace["description"] = combinedRace["description"] + parsedRace["description"];
						combinedRace["appearance"] = combinedRace["appearance"] + parsedRace["appearance"];
						combinedRace["customs"] = combinedRace["customs"] + parsedRace["customs"];
						merged = true;
					}
				}

				if (!merged) {
					combinedObject["races"].push(parsedRace);
				}
			}
		}

		if ("characters" in parsedMsg) {
			for (const j in parsedMsg["characters"]) {
				var parsedNPC = parsedMsg["characters"][j];
				var merged = false;

				var npcName = parsedNPC["name"];
				for (const k in combinedObject["characters"]) {
					var combinedNPC = combinedObject["characters"][k];
					if (compareNames(npcName, combinedNPC["name"])) {
						combinedNPC["description"] = combinedNPC["description"] + parsedNPC["description"];
						combinedNPC["history"] = combinedNPC["history"] + parsedNPC["history"];
						combinedNPC["events"] = [...new Set(combinedNPC["events"].concat(parsedNPC["events"]))];
						merged = true;
					}
				}

				if (!merged) {
					combinedObject["characters"].push(parsedNPC);
				}
			}
		}

		if ("events" in parsedMsg) {
			combinedObject["events"] = [...new Set(combinedObject["events"].concat(parsedMsg["events"]))];
		}
		
		if ("rules" in parsedMsg) {
			combinedObject["rules"] = [...new Set(combinedObject["rules"].concat(parsedMsg["rules"]))];
		}
		} catch (error){
			console.log(error);
			console.log("Not valid JSON " + promptMessages[i]);
		}
	}

	console.log(JSON.stringify(combinedObject, null, 4));
}

function compareNames(string1, string2) {
	const regex = /(?:(the|a|an) +)/g; 
	const subst = ` `;

	// The substituted value will be contained in the result variable
	var cleaned1 = string1.toLowerCase().replace(regex, subst).trim();
	var cleaned2 = string2.toLowerCase().replace(regex, subst).trim();
	
	return (cleaned1.includes(cleaned2) || cleaned2.includes(cleaned1));
}

function startAdventure(event) {
	var sessionName = get("","currentSession");
	var playerName = get(sessionName, "current-player");
	set(sessionName, "hot-summary", "");
	
	var message = craftMessage(sessionName, playerName, "introduce the game, it will be written as narrator of a story. This introduction will consist of the following parts, an overview of the game world and setting, an introduction to the main character, an original expository event that starts the story off.");
	
	console.log(JSON.stringify(message));

        prompt(message).then(function(msg) {
	      processResponse(msg);
		$( "#text-submit-area" ).show();
		$( "#text-submit-button" ).show();
		$( "#start-adventure-button" ).hide();
	    });
}


function submitAction(event) {
	var sessionName = get("","currentSession");
	var playerName = get(sessionName, "current-player");
	var action = document.querySelector('#text-submit-area').value;
	document.querySelector('#text-submit-area').value = "";
	
	// Add action to the log

	// Set the running log
	var log = get(sessionName, "log");
	if (!log) {
		log = action;
	} else {
		log = log + "<br><br>" + action;
	}
		
	set(sessionName, "log", log);
	
	$( "#text-response-field" ).html(log);
	
	console.log(action);
	
	var message = craftMessage(sessionName, playerName, action);
	
	console.log(JSON.stringify(message));

        
	prompt(message).then(processResponse);
}

function craftMessage(sessionName, playerName, message) {
	// Get the session name
	var sessionName = get("","currentSession");
	var mechanics = get(sessionName, "mechanics");
	
	// We will use this to make sure we don't provide the same saved object more than once.
	var filter = new Set();
	
	// Initialize the message array to pass to gpt
	var messageArray = [];
	
	
	// Set the system state
	messageArray.push({"role":"system", "content": "You are a game master using the " + mechanics + " rules, all of your responses are formatted as JSON."});
	
	
	// Pass in general background
	var setting = "The setting for this role playing game is " + get(sessionName, "setting");
	if (setting) messageArray.push({"role":"assistant", "content": setting});
	
	
	// Pass in the game state
	var gameState = get(sessionName, "game-state");
	if (gameState) messageArray.push({"role":"assistant", "content": "This is the current game state: " + gameState});
	
	
	// Pass in the player character object
	var playerName = get(sessionName, "current-player");
	var playerObject = JSON.parse(get(sessionName, playerName));
	if (playerObject) messageArray.push({"role":"assistant", "content": "My player character is " + playerName + "." + playerObject.background + ". This is my character sheet, player-character-sheet=" + JSON.stringify(playerObject.json)});
	filter.add(playerName);
	
	// Pass in party characters
	var party = JSON.parse(get(sessionName + ".group", "party"));
	if (party) {
		console.log("PARTY");
		var partyNPCs = party["notable-npcs"];
		if (partyNPCs) {
			console.log(partyNPCs);
			var partyObjects = [];
			for (var i in partyNPCs) {
				var partyNPC= get(sessionName + ".npc", partyNPCs[i]);
				if (partyNPC) {
					partyObjects.push(partyNPC);	
					
					// Add the name of the NPC to the filter
					filter.add(partyNPCs[i]["name"]);
				}
			}
			
			console.log(partyObjects);
			
			if (partyObjects.length > 0) messageArray.push({"role":"assistant", "content": "these are the characters currently following the player character: [" + partyObjects.join(",") + "]"});
		}
	}
	
	// Process the last turn object
	var properNounMessage = message;
	
	var fullLocations = [];
	var shortLocations = [];
	var fullNPCs = [];
	var shortNPCs = [];
	var lastTurn =  get(sessionName, "last-turn");
	
	if (lastTurn) {
		var lastTurnMessage ="This was the state of the game last turn: " + lastTurn;
		
		// Get full locations
		var lastTurnObject = JSON.parse(lastTurn);
		
		if ("story" in lastTurnObject) properNounMessage = properNounMessage + ". " + lastTurnObject["story"];
		
		if ("location" in lastTurnObject) {
			var lastTurnLocation = get(sessionName + ".location", lastTurnObject["location"]);
			if (lastTurnLocation) {
				fullLocations.push(lastTurnLocation);
				
				// Add the name of the location to the filter
				filter.add(lastTurnObject["location"]);
			}
		}
		
		// Get short locations
		if ("nearby-locations" in lastTurnObject) {
			var lastTurnNearbyLocations =  JSON.parse(lastTurnObject["nearby-locations"]);
			for (var i in lastTurnNearbyLocations) {
				var ltnbLocation= get(sessionName + ".location", lastTurnNearbyLocations[i]);
				if (ltnbLocation) {
					shortLocations.push(JSON.parse(ltnbLocation));
					
					// Add the name of the location to the filter
					filter.add(lastTurnNearbyLocations[i]);
				}
			}
		}
		
		// Get full NPCs
		if ("npc-interactions" in lastTurnObject && lastTurnObject["npc-interactions"].length > 0) {
			console.log(lastTurnObject["npc-interactions"]);
			var lastTurnNPCs =  lastTurnObject["npc-interactions"];
			for (var i in lastTurnNPCs) {
				var lastNPC= get(sessionName + ".npc", lastTurnNPCs[i]["name"]);
				if (lastNPC) {
					fullNPCs.push(lastNPC);	
					
					// Add the name of the NPC to the filter
					filter.add(lastTurnNPCs[i]["name"]);
				}
			}
		}
	}
	
	
	// Pass in the full locations
	if (fullLocations.length > 0) messageArray.push({"role":"assistant", "content": "here is some information for locations in this setting: [" + fullLocations.join(",") + "]"});
	
	
	// Process the short locations
	var shortLocationString = ""
	for (var i in shortLocations) {
		var tempLocation = {};
		var shortLocation = shortLocations[i];
		tempLocation["name"] = shortLocation["name"];
		if ("short-description" in shortLocation) {
			tempLocation["description"] = shortLocation["short-description"];
		}
		
		if ("hot-summary" in shortLocation) {
			tempLocation["hot-summary"] = shortLocation["hot-summary"];
		}
		shortLocationString = shortLocationString + "," + JSON.stringify(tempLocation);
	}
	
	if (shortLocationString) messageArray.push({"role":"assistant", "content": "here is some information for locations in this setting: [" + shortLocationString.substring(1) + "]"});
	
	
	// Pass in the full NPCs
	if (fullNPCs.length > 0) messageArray.push({"role":"assistant", "content":"here is some information for characters in this setting: [" + fullNPCs.join(",") + "]"});
	
	// Pass in the short NPCs
	var shortNPCString = ""
	for (var i in shortNPCs) {
		var tempNPC = {};
		var shortNPC = shortNPCs[i];
		tempNPC["name"] = shortNPC["name"];
		if ("short-description" in shortNPC) {
			tempNPC["short-description"] = shortNPC["short-description"];
		}
		
		if("health" in shortNPCs) {
			tempNPC["health"] = shortNPC["health"];	
		}
		
		if("state" in shortNPCs) {
			tempNPC["state"] = shortNPC["state"];	
		}
		
		if ("hot-summary" in shortNPC) {
			tempNPC["hot-summary"] = shortNPC["hot-summary"];
		}
		
		if ("cold-summary" in shortNPC) {
			tempNPC["cold-summary"] = shortNPC["cold-summary"];
		}
		shortNPCString = shortNPCString + "," + JSON.stringify(tempNPC);
	}
	
	var shortNPCMessage = "";
	if (shortNPCString) shortNPCMessage = "here is some information for characters in this setting: [" + shortNPCString.substring(1) + "]";
	
	
	// Pass in mentioned objects
	var nouns = getProperNouns(properNounMessage, filter);
	var mentionedObjects = [];
	for (var i in nouns) {
		mentionedObjects = mentionedObjects.concat(search(nouns[i]));
	}
	
	if (mentionedObjects.length > 0) messageArray.push({"role":"assistant", "content": "here is some additional context: [" + mentionedObjects.join(",") + "]"});
	
	// Pass in campaign
	var campaign = get(sessionName, "campaign");
	if (campaign) messageArray.push({"role":"assistant", "content": campaignMessage});"This is the the adventure for the player. adventure-outline=\"" + campaign + "\"";
	
	
	// Pass in events
	var events = get(sessionName, "events");
	if (events) messageArray.push({"role":"assistant", "content": "These are some events and their conditions\"" + get(sessionName, "events") + "\""});
	
	// Pass in the summary
	var coldSummary = get(sessionName, "cold-summary");
	var hotSummary = get(sessionName, "hot-summary");
	if(coldSummary) hotSummary = coldSummary + " " + hotSummary;
	if (hotSummary) messageArray.push({"role":"assistant", "content": "These are the events that have happened so far in the game: " + hotSummary});
	
	
	// Get the writing style otherwise use a default style
	var writingStyle = get(sessionName, "writingStyle");
	if (!writingStyle) {
		writingStyle = "";
	}
	
	var summaryStyle = get("", "summarystyle");
	if (!summaryStyle) {
		summaryStyle = "concise minimal third person";
	}
	
	var gamePrompt = "You are a game master running a game using the rules of " + mechanics + "\n\nThis is a JSON template for the game output:\n{\n\"turn_number\": <TURN>,\n\"roll\" <ROLL>,\"player\": <PLAYER>,\n\"location\":  <LOCATION>,\n\"story\": <STORY>,\n\"summary\": <SUMMARY>,\n\"location_interations\": <LOCATION_INTERACTIONS>,\n\"npc_interactions\": <NPC_INTERACIONS>,\n\"group_interactions\": <GROUP_INTERACIONS>,\n\"points_of_interest\": <POI>,\n\"team\": <TEAM>\n,\"game_state\": <GAME STATE>}\n\nIn the template above items in angles brackets represent tokens that will be replaced by text and should not be displayed. Match the token with the specifications below:\n• <TURN>\n		○ The current turn number. Increment it each turn.\n    • <ROLL>\n		○ The result of any dice rolls that were required to resolve an action, include the attribute or skill being rolled for. Return a null if no dice rolls were done\n	• <PLAYER>\n		○ A valid JSON object representing any changes made to the character sheet represented by the JSON object player-character-sheet, for example if the player had 10 health and lost 2 the object would be {\"hit points\": 8}. If there have been no changes return a null \n	• <LOCATION>\n		○ The current location as understood by the main character.\n	• <STORY>\n		○ The results of the actions taken from the last turn. Write it as a narrative, but stop before my character's next action. Include descriptions of locations and NPCs that are new since the last turn. Use a second person perspective, include a lot of dialogue.\n			  * <SUMMARY>\n    ○ A " + summaryStyle + " summary of <STORY>, the player character should be referred to by name.\n  * <LOCATION_INTERACIONS>\n    ○ A JSON array that looks like this\n [\"<A  " + summaryStyle + " summary string of the players interactions with the location>\"]\n  * <NPC_INTERACTIONS>\n    ○ A JSON array that looks like this\n[{\"name\": <The Name of the NPC>, \"health\": <The NPCs health>, \"state\": <The NPCs current state, such as stunned or paralyzed>, \"interaction\": [\"<A " + summaryStyle + " summary of the players interaction with the NPC>\"]}] \n  * <GROUP_INTERACTIONS>\n    ○ A JSON array that looks like this\n[{\"name\": <The name of the group or party>, \"state\": <The groups current state, such as stunned or paralyzed>, \"notable-npcs\": [\"<A list of the notable NPCs, or members of the group>\"]}] \n  * <POI>\n    ○ A JSON array that contains the names of at least 3 nearby locations, looks like [\"location1\", \"location2\", \"location3\"] \n  * <TEAM>\n    ○ A JSON array that contains the names of any character following the player or is part of the players group., looks like [\"character name\", \"character name 2\"] \n  * <GAME STATE>\n ○ A string that contains any game level status, such as game phase, count down clocks, etc. \n\nThere are some special commands I can issue. These result of the command will replace [story] in the game output. The special commands are issued with one of the words below and has the listed result.\n	• hint\n		○ You will replace <STORY> with a small hint to point me an interesting direction for the story.\n\nThe following rules are central to the game logic and must always be followed:\n	1. Use the rules for " + mechanics + "\n        2. After you output the template, that ends one turn. Wait for my response to start the next turn.  3. The output should always be valid JSON and nothing else. 4. If adventure-outline is defined, use adventure-outline as a guide on what situations and events to present to the player. 5. Do any event whose conditions have been met. \n\n\nSettings: " + setting + "\nPlayer:" + playerName;
	
	if (writingStyle) {
		gamePrompt = gamePrompt + "\n\n" + writingStyle + "\n\n";	
	}
	
	
	// Create user message
	var userMessage = gamePrompt + ", Action: " + message;
	
	// Pass in the last turn
	if (lastTurnMessage) userMessage = userMessage + "\n\n" + lastTurnMessage
	//messageArray.push({"role":"assistant", "content": lastTurnMessage});
	
	// Pass in the game prompt
	messageArray.push({"role":"user", "content": userMessage});
			       
	return messageArray;
}

function getProperNouns(message, filter) {
	console.log("checking mentioned context");
	var re = /([A-Za-z]\s+)([A-Z][a-z]+(\s+[A-Z][a-z]+)*)/g;
	var m;

	var nouns = new Set();
	do {
	    m = re.exec(message);
	    if (m) {
		if (filter) {
			if (!filter.has(m[2])) {
				nouns.add(m[2]);
				console.log(m[2]);
			}
		} else {
			nouns.add(m[2]);
			console.log(m[2]);
		}
	    }
	} while (m);
	
	return [...nouns];
}

function processInitialResponse(message) {
	return new Promise(function(resolve, reject) {
		console.log("processing response");
		console.log(message);
		var response = JSON.parse(message);
		console.log(response);

		// initialize the last turn object
		var messageObject = {"lastTurn": {}, "response": response};
		resolve(messageObject);
	});
}

function processGameState(messageObject) {
	return new Promise(function(resolve, reject) {
		console.log("processing game state");
		var sessionName = get("","currentSession");
		var gameState = messageObject.response["game_state"];
		if (gameState) set(sessionName, "game-state", gameState);
		resolve(messageObject);
	});
}

function processPlayer(messageObject) {
	return new Promise(function(resolve, reject) {
		console.log("processing player");
		var changeObject = messageObject.response["player"];
		if (changeObject) modifyPlayer(changeObject);
		resolve(messageObject);
	});
}


function processTurnNumber(messageObject) {
	return new Promise(function(resolve, reject) {
		console.log("processing turn number");
		var turnNumber = messageObject.response["turn_number"];
		console.log("turn: " + turnNumber);
		if (turnNumber) {
			$( "#turn-number" ).text(turnNumber);
		
			// Add turn number to the last turn object
			messageObject.lastTurn["turn"] = turnNumber;
		}
		resolve(messageObject);
	});
}


function processLocation(messageObject) {
	return new Promise(function(resolve, reject) {
		console.log("processing location");

		var sessionName = get("","currentSession");
		var location = messageObject.response["location"];
		console.log("location: " + location);
		if (location) {
			$( "#location-field" ).text(location);
		
			// Add location to the last turn object
			messageObject.lastTurn["location"] = location;
		
			// Check if location interactions need to be compressed
			var locationObject = get(sessionName + ".location", location);
			locationObject = JSON.parse(locationObject);
			if (!locationObject) {
				locationObject = {"name": location, "hot-summary": ""};
			}

			compressObjectSummary(locationObject).then((newObject) => {
				// Save location interactions
				var location_interactions = messageObject.response["location_interactions"];
				if (location_interactions) {
					var summary = newObject["hot-summary"];
					if (summary) {
						summary = summary + " " + location_interactions.join('. ');
					} else {
						summary = location_interactions.join('. ');
					}
				
					newObject["hot-summary"] = summary;
				}
				set(sessionName + ".location", location, JSON.stringify(newObject));

				resolve(messageObject);
			});
			
	
			
		} else {
			resolve(messageObject);
		}
	});
}

function processNPC(messageObject) {
	return new Promise(function(resolve, reject) {
		var sessionName = get("","currentSession");

		console.log("processing NPCs");
		var npc_interactions = messageObject.response["npc_interactions"];

		if (npc_interactions) {
			if (npc_interactions.length > 0) messageObject.lastTurn["npc-interactions"] = npc_interactions;

			var npcPromises = []; // collecting all page promises
			for (var i in npc_interactions) {
				// Grap the npc_interactons from the message object
				var npc = npc_interactions[i];
				var npcName = npc["name"];

				// If the NPC is null move to the next one
				if (!npcName || npcName == "null") continue;
				
				// Join the interactions if they are an array
				var npcInteraction = "";
				if (typeof npc["interaction"] == "object") {
					npcInteraction = npc["interaction"].join('. ');
				} else if (typeof  npc["interaction"] == "string") {
					npcInteraction = npc["interaction"];
				}

				// Grab the npc object from memory
				var npcObject = get(sessionName + ".npc", npcName);
				npcObject = JSON.parse(npcObject);
				if (!npcObject) {
					npcObject = {"name": npcName, "hot-summary": ""};
				}
				

				npcPromises.push(compressObjectSummary(npcObject).then((newObject) => {
					var summary = npcObject["hot-summary"];

					if (summary) {
						summary = summary + " " + npcInteraction;
					} else {
						summary = npcInteraction;
					}

					npcObject["hot-summary"] = summary;
					
					if (npc["health"]) npcObject["health"] = npc["health"];
					if (npc["state"]) npcObject["state"] = npc["state"];

					set(sessionName + ".npc", npcName, JSON.stringify(npcObject));
				}));
			}

			Promise.all(npcPromises).then(function () {
	      			resolve(messageObject);
	    		});
				
		} else {
			resolve(messageObject);
		}
	});
}

function processPOI(messageObject) {
	return new Promise(function(resolve, reject) {
		var poi = messageObject.response["points_of_interest"];
		console.log("processing poi: " + poi);
		if (poi) {
			var poilocations = poi.join('<br>');
			$( "#poi-field" ).html(poilocations);
		
			// add nearby locations to the last turn
			messageObject.lastTurn["nearby-location"] = poi;
		}

		resolve(messageObject);
	});
}

function processSummary(messageObject) {
	return new Promise(function(resolve, reject) {
		var summary = messageObject.response["summary"];
		console.log("processing summary: " + summary);
		if (summary) {
			var sessionName = get("","currentSession");
			var hotsummary = get(sessionName, "hot-summary");
			hotsummary = hotsummary + " " + summary;
			set(sessionName, "hot-summary", hotsummary);
		}

		resolve(messageObject);
	});
}

function processStory(messageObject) {
	return new Promise(function(resolve, reject) {
		console.log("processing story");
		var sessionName = get("","currentSession");
		
		var mainResponse = ""

		// Process the roll information
		var roll = messageObject.response["roll"];
		
		if (roll) {
			if (typeof roll === 'object') {
				roll = JSON.stringify(roll,null,4);
			}
			mainResponse = mainResponse + "<br><br>Roll: " + roll + "<br><br>";	
		}

		// Process the story
	
		var story = messageObject.response["story"];
		if (story) {
			// Add in html formatting
			story = story.replace(/(?:\r\n|\r|\n)/g, '<br>');
			mainResponse = mainResponse + story;	
		
			// add story to the last turn object
			messageObject.lastTurn["story"] = story;
		
			// Set the last turn
			set(sessionName, "last-turn", JSON.stringify(messageObject.lastTurn));
		
			// Set the running log
			var log = get(sessionName, "log");
			if (!log) {
				log = mainResponse;
			} else {
				log = log + "<br><br>" + mainResponse;
			}
		
			set(sessionName, "log", log);
		}
	
		if (mainResponse) {
			$( "#text-response-field" ).html(log);
		}

		resolve(messageObject);
	});
}

function processResponse(message) {
	return processInitialResponse(message).then(processGameState).then(processPlayer).then(processTurnNumber).then(processLocation).then(processNPC).then(processPOI).then(processSummary).then(processStory);
}

function compressObjectSummary(newObject) {
	return new Promise((resolve) => {
		var coldSummary = newObject["cold-summary"];
		var hotSummary = newObject["hot-summary"];
			
		// If the cold summary has grown too large compress it
		if (coldSummary && coldSummary > hotSummary) {
			if (coldSummary.length > 1500) {
				console.log("compressing object cold-summary");
				var message = "Create a concise summary of this: " + coldSummary;
				var messages = [{"role":"user", "content": message}];
				gptQuery(messages).then(extractMessage).then((message) => {
					console.log("setting object compressed summary");
					newObject["cold-summary"] = message;
					resolve(newObject);
				});
			} else {
				resolve(newObject);
			}
		} else {
			if (hotSummary.length > 1500) {
				console.log("compressing object hot-summary");
				var message = "Create a concise summary of this: " + hotSummary;
				var messages = [{"role":"user", "content": message}];
				gptQuery(messages).then(extractMessage).then((message) => {
					console.log("setting object compressed summary");
					newObject["cold-summary"] = newObject["cold-summary"] + " " + message;
					newObject["hot-summary"] = "";
					resolve(newObject);
				});
			} else {
				resolve(newObject);
			}
		}
	});		
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
 var sessionWriting = document.querySelector('#session-creation-writing').value;
 
  // Creating the Session Object
  var sessionObject = {};
 
  sessionObject.name = sessionName;
  if (sessionDescription) {
    sessionObject.description = sessionDescription;
  }
  
  
  // Saving the text fields to Local Storage
  set("", sessionName, JSON.stringify(sessionObject));
  
  if (sessionMechanics) {
  	set(sessionName, "mechanics", sessionMechanics);
  }
  
  if (sessionSetting) {
  	set(sessionName, "setting", sessionSetting);
  }
  
  // Adding session the the list of sessions
  var sessionArrayString = get("", "sessions");
  
  if (sessionArrayString) {
    var sessionArray = JSON.parse(sessionArrayString);
    sessionArray.push(sessionName);
  } else {
    var sessionArray = [sessionName];
  }
  
  set("", "sessions", JSON.stringify(sessionArray));
  
  set("", "currentSession", sessionName);
	
  if (sessionCampaign) {
	 createCampaign(sessionSetting, sessionCampaign).then(createAdventures).then(adventureDetails).then(processCampaignObjects);
  }
	
  if (sessionWriting) {
	  set(sessionName, "writing-style", sessionWriting);
  }
  
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
  var tempSession = get("", sessionName);
  var tempMechanics = get(sessionName, "mechanics");
  var tempSetting = get(sessionName, "setting");
  var tempCampaign = get(sessionName, "campaign");
  var tempArray = get("", "sessions");

  console.log("out: "+ tempSession);
  console.log("out: "+ tempMechanics);
  console.log("out: "+ tempSetting);
  console.log("out: "+ tempCampaign);
  console.log("out: "+ tempArray);
  
  initializeNewCharacterCreation(sessionName);
}

function processCampaignObjects(campaignObjects) {
	console.log("---------------------processing campaign objects");
	console.log(campaignObjects);
	var sessionName = get("", "currentSession");
	
	var finalLocations = [];
	var finalGroups = [];
	var finalRaces = [];
	var finalNPCs = [];
	var finalEvents = [];
	
	// Loop over all the campaign objects
	for (var i in campaignObjects) {
		var adventure = campaignObjects[i].adventure;
		var locations = campaignObjects[i].locations;
		var groups = campaignObjects[i].groups;
		var races = campaignObjects[i].races;
		var npcs = campaignObjects[i].npcs;
		var events = campaignObjects[i].events;
		
		// Process adventure
		set(sessionName, "campaign", adventure.description);
		
		// deduplicate lists
		finalLocations = deduplicateArray(finalLocations.concat(locations), ["description", "history"], ["groups", "npcs", "events", "nearby-locations"]);
		finalGroups = deduplicateArray(finalGroups.concat(groups), ["description", "history"], ["notable-npcs"]);
		finalRaces = deduplicateArray(finalRaces.concat(races), ["description", "appearance", "customs"], []);
		finalNPCs = deduplicateArray(finalNPCs.concat(npcs), ["description", "history"], ["events"]);
		
		console.log("-----------------------------------------Here are the arrays");
		console.log(finalLocations);
		
		
		var eventSet = new Set();
		
		for (var j in events) {
			eventSet.add(events[j]);	
		}
		
		for (var j in finalEvents) {
			eventSet.add(events[j]);	
		}
		
		finalEvents = [...eventSet];
	}
	
	// process locations
	for (var j in finalLocations) {
		var finalLocation = finalLocations[j];
				console.log("------++++++++++++++++ " + JSON.stringify(finalLocation));
		// create the interior locations
		var locationMessage = 'This is a template for your response:{"locations": <locations>} In the template above items in angles brackets represent tokens that will be replaced by text and should not be displayed. Match the token with the specifications below: <locations>: This should be a valid JSON array that looks like [{"name": <The name of the location>, "description": <A description of the location, including appearance, function and mood>, "groups": <a json array of strings containing the groups associated with the location>, "npcs": <a json array of strings containing npcs currently in this location>, "history": <any history of this specific location>, "events": <a json array of of objects that represent any campaign events that are suppose to happen when a player visits this location, and their requirements>, "nearby-locations": <a json array of strings containing any relevant nearby locations>}]. Here is an example of the JSON array [{"name": "The Yawning Portal", "description": "The yawning portal is a very popular tavern in waterdeep. It is several hundred years old which can be seen in the weather worn wood construction. The inside is illuminated by fire light and and the ethereal light coming from a portal in the center of the building. The portal leads to an endless underground labyrinth.", "groups": ["harpers", "city guard"], npcs: ["joe, the bartender", "captain rex", "john smith"], "history": "The yawning portal was first constructed 300 years ago around a mysterious portal on a hill side. 200 years ago it was burnt down and rebuilt.", "events" : [{"event": "Joe the bartender gives the player a mysterious letter", "condition": "the player must have already talked to the mystic"}, {"event": "A bar fight breaks out", "condition": "the player brings up the topic of the mysterious letter"}], "nearby-locations:["The portal", "the bar", "the waterdeep keep"]}] \n\nUsing that template, create four inner locations for the following location:\n\n' + JSON.stringify(finalLocation);
		
		var messages = [{"role":"user", "content": locationMessage}];
		console.log(locationMessage);
		prompt(messages).then((message) => {
			console.log(message);
			var innerLocations = JSON.parse(message).locations;
			var nearby = new Set();

			for (var k in innerLocations) {
				saveCampaignObject(sessionName + ".location", innerLocations[k], ["groups", "npcs", "events", "nearby-locations"]);
				nearby.add(innerLocations[k].name);
			}

			console.log(finalLocations[j]);
			finalLocation["nearby-locations"] =  finalLocation["nearby-locations"].concat([...nearby]);
			// Save the original locations
			saveCampaignObject(sessionName + ".location", finalLocation, ["groups", "npcs", "events", "nearby-locations"]);
		})

	}

	for (var j in finalGroups) {
		saveCampaignObject(sessionName + ".group", finalGroups[j], ["notable-npcs"]);
	}

	for (var j in finalRaces) {
		saveCampaignObject(sessionName + ".race", finalRaces[j], []);
	}

	for (var j in finalNPCs) {
		saveCampaignObject(sessionName + ".npc", finalNPCs[j], ["notable-npcs"]);
	}

	var oldEvents = JSON.parse(get(sessionName, "events"));
	if (oldEvents) {
		oldEvents = oldEvents.concat(finalEvents);
	} else {
		oldEvents = finalEvents;	
	}
	set(sessionName, "events", JSON.stringify(oldEvents));
	
	console.log("----------------------------FINISHED BUILDING CAMPAIGN--------------------------------------------");
}

function saveCampaignObject(prefix, cobject, listFields) {
	var name = cobject.name;
	var saved = get(prefix, name);
	
	if (saved) {
		var savedObject = JSON.parse(saved);
		for (var i in listFields) {
			var field = listFields[i];
			if (field in savedObject) {
				savedObject[field] = savedObject[field].concat(cobject[field]);
			} else {
				savedObject[field] = cobject[field];
			}
		}
		set(prefix, name, JSON.stringify(savedObject));
	} else {
		set(prefix, name, JSON.stringify(cobject));	
	}
}

function deduplicateArray(objectArray, topLevelFields, listFields) {
	var objectCache = new Set();
	var finalObjects = [];

	for (var j in objectArray) {
		var object1 = objectArray[j];
		if(object1 && !objectCache.has(object1.name)) {
			for (var k in objectArray) {
				var object2 = objectArray[k];
				if (object1.name == object2.name) {
					object1 = merge(object1, object2, topLevelFields, listFields);
				}
			}
			finalObjects.push(object1);
			objectCache.add(object1.name);
		}
	}
	
	return finalObjects;
}

function merge(location1, location2, topLevelFields, listFields) {
	// Replace top level fields
	for (var i in topLevelFields) {
		if (topLevelFields[i] in location2) location1[topLevelFields[i]] = location2[topLevelFields[i]];
	}
	
	// deduplicate the list fields;
	
	for (var i in listFields) {
		var listField = listFields[i];
		var fieldSet = new Set();
		for (var j in location1[listField]) {
			fieldSet.add(location1[listField][j]);	
		}
		
		for (var j in location2[listField]) {
			fieldSet.add(location2[listField][j]);	
		}
		
		location1[listField] = [...fieldSet];
	}
	
	return location1;
}

function createCampaign(setting, text) {
	return new Promise((resolve, reject) => {
		console.log("creating a new campaign");
		var campaignMessage = "outline a campaign about " + text + " set in " + setting + " that consists of five adventures that are part of a larger story, format it as a JSON array of strings.";
		var messages = [{"role":"user", "content": campaignMessage}];
		prompt(messages).then((message) => {
			console.log(message);
			resolve(message);
		})
	});
}

function createAdventures(message) {
	return new Promise((resolve, reject) => {
		console.log("creating adventures");
		var adventures = JSON.parse(message);
		var adventurePromises = [];
		var messages = [];
		for (var i in adventures) {
			var campaignMessage = "create a detailed outline of this adventure:  " + adventures[i] + ", format it as a JSON array of strings.";
			var messages = [{"role":"assistant", "content": "This is an outline of the campaign: " + JSON.stringify(adventures)}, {"role":"user", "content": campaignMessage}];
			
			adventurePromises.push(prompt(messages));
		}
		
		Promise.all(adventurePromises).then((newmessages) => {
			var adventureArray = []
			for (var i in newmessages) {
				var cleanedMessage = newmessages[i].replace(/(\r\n|\n|\r)/gm, "").replace(",]", "]");
				var adventure = JSON.parse(cleanedMessage);
				console.log(adventure);
				adventureArray = adventureArray.concat(adventure);
			}
			
			console.log(adventureArray);
			resolve({"adventureSteps":adventureArray, "adventureOutline": adventures});
		});
	});
}

function adventureDetails(message) {
	return adventureDetailsPromise({"adventureSteps": message.adventureSteps, "backup": message.adventureOutline, "adventureDetails": [], "npcs": new Set(), "locations": new Set(), "groups": new Set()});
}

function adventureDetailsPromise(message) {
	var adventureSteps = message.adventureSteps;
	var adventureDetails = message.adventureDetails;
	var backup = message.backup;
	var npcs = message.npcs;
	var locations = message.locations;
	var groups = message.groups;
	
	// Check the end condition for the recursion
	if (adventureSteps.length == 0) {
		console.log("------------------------finishing recursion");
		return new Promise((resolve, reject) => {
			resolve(adventureDetails);
		});
	}

	var messages = [];

	// Set the complete outline for the adventure
	if (backup) {
		messages.push({"role":"assistant", "content": "This is an outline of the adventure: " + JSON.stringify(backup)});
	}

	// Provide the named locations so far
	if (locations && locations.size > 0) {
		messages.push({"role":"assistant", "content": "here are defined locations in this adventure so far: " + JSON.stringify([...locations])});
	}

	// Provide the named NPCs so far
	if (npcs && npcs.size > 0) {
		messages.push({"role":"assistant", "content": "here are defined characters in this adventure so far: " + JSON.stringify([...npcs])});
	}

	// Provide the named groups so far
	if (groups && groups.size > 0) {
		messages.push({"role":"assistant", "content": "here are defined groups in this adventure so far: " + JSON.stringify([...groups])});
	}


	var nextStep = adventureSteps.shift();
	
	console.log("-------------------------------------Next Step: " + nextStep);

	var adventureMessage = "I want you to create detailed information about this step of the adventure: " + nextStep + " Only output valid JSON. This is a template for your response:{\"adventure\": <adventure>,\"locations\": <locations>,\"groups\": <groups>,\"races\": <races>,\"npcs\": <npcs>,\"events\": <events>}, In the template above, items in angles brackets represent tokens that will be replaced by text and should not be displayed. Match the token with these specifications: <adventure>: This should be a valid JSON object that looks like {\"name\": <name of the adventure>, \"description\": <a short concise summary of the adventure>}. Here is an example {\"name\": \"The Burried City\", \"description\": \"The players will go on an adventure to find treasure in a mysterious burried city. Doing so will uncover an ancient evil\"} <locations>: This should be a valid JSON array that looks like [{\"name\": <The name of the location>, \"description\": <A description of the location, including appearance, function and mood>, \"groups\": <a json array of strings containing the groups associated with the location>, \"npcs\": <a json array of strings containing npcs currently in this location>, \"history\": <any history of this specific location>, \"events\": <a json array of of objects that represent any campaign events that are suppose to happen when a player visits this location, and their requirements>, \"nearby-locations\": <a json array of strings containing any relevant nearby locations>}]. Here is an example of the JSON array [{\"name\": \"The Burried City\", \"description\": \"The burried city is an ancient mysterious place, far in the underdark. Its passages are full of deadly traps and puzzles\", \"groups\": [\"The Cult of the Undead\", \"Draugr\"], npcs: [\"Mysterious Hooded Figure\", \"Rex, a wererat merchant\"], \"history\": \"The Burried city was once the home of a civilization of powerful mages. Their hunger for power grew too much dooming the city.\", \"events\" : [{\"event\": \"Joe the bartender gives the player a mysterious letter\", \"condition\": \"the player must have already talked to the mystic\"}, {\"event\": \"A bar fight breaks out\", \"condition\": \"the player brings up the topic of the mysterious letter\"}], \"nearby-locations:[\"The underdark\", \"the ruin of a building\", \"a long crevasse\"]}]  <groups>: This should be a valid JSON array that looks like [{\"name\": <the name of the group>, \"description\": <a description of the group>, \"history\": <a history of the group>, \"notable-npcs\": <a json array of string containing the names of notable npcs related to this group>}]. Here is an example: [{\"name\":\"harpers\", \"description\": \"The Harpers, or Those Who Harp, was a semi-secret organization dedicated to preserving historical lore, maintaining the balance between nature and civilization,and defending the innocent from the forces of evil across the Realms.The Harpers involved themselves in many world-changing events that helped shaped the course of Faerûn's destiny. Their power and influence waxed and waned over the years, as their order underwent a series of collapses and reformations.Their reputation amongst the people of the Realms just as varied wildly. They were just as often seen seen as wild-eyed idealists as they were insufferable meddlers who could not keep their business to themselves.\", \"history\": \"On the 27th of Flamerule in the Year of the Dawn Rose, 720 DR, a large congregation of dryads arrived at the Dancing Place druid grove in High Dale. Their arrival occurred at a time when dusk fell earlier than it should have and a bright moon shone when no moon should have been visible. The dryads bid the druids welcome the prizests of many different gods who started to arrive before finally Elminster appeared to explain why they had all been called.\", \"notable-npcs\":[\"Arilyn Moonblade\", \"Arrant Quill\"]}]  <races>: This should be a valid JSON array that looks like [{\"name\": <The name of the race or species or creature>, \"description: <A description of the race>, \"appearance\": <Common defining features for appearance>, \"customs\": <a description of any customs specific to this race>}]. Here is an example: [{\"name\": \"orc\", \"description\": \"Orcs were a race of humanoids that had been a threat to the civilized cultures of Toril, particularly Faerûn, for as long as any could remember. This changed somewhat in the years preceding and immediately after the Spellplague, when a horde of mountain orcs under the command of King Obould Many-Arrows unified into a single kingdom, one that was remarkably civilized.\", \"appearance\": \"Orcs varied in appearance, based on region and subrace, but all shared certain physical qualities. Orcs of all kinds usually had grayish skin, coarse hair, stooped postures, low foreheads, large muscular bodies, and porcine faces that featured lower canines that resembled boar tusks.\", \"customs\": Traditional orcish culture was extremely warlike and when not at war the race was usually planning for it. Most orcs approached life with the belief that to survive, one had to subjugate potential enemies and control as many resources as possible, which put them naturally at odds with other races as well as each other.\"}] <npcs>: This should be a valid JSON array that looks like [{\"name\":<The name of the NPC>, \"description\": <A description of the NPC>, \"history\": <A history of the npc>, \"events\": <a json array of of objects that represent any campaign events that are suppose to happen when a player talks to this npc, and their requirements>}]. Here is an example: [{\"name\":\"Joe Smith\", \"description\": \"joe smith is a tall elf with long flowing white hair. He is blunt and lacks a sense of humor. he works as a carpenter\", \"history\": \"Joe smith grew up in waterdeep, he attended the university there\", \"events\": [{\"event\": \"Joe smith gives the player a chair\", \"condition\": \"the player found joe smith's lost tools\"}]}] <events>: These are events not tied to a location or NPC, This should be a valid JSON array that looks like [{\"event\": <the event that will happen>, \"condition\": <the required conditions necessary for the event to happen>}]. Here is an example: [{\"event\": \"A courier arrives and gives the player a mysterious message\", \"condition\": \"the player had taken the treasure from the under dark\"}]";
	messages.push({"role":"user", "content": adventureMessage});

	return prompt(messages).then((newmessage) => {
			console.log(newmessage);
			try {
				var stepObject = JSON.parse(newmessage.replace(/(\r\n|\n|\r)/gm, ""));

				// add new object to the adventure details array
				adventureDetails.push(stepObject);

				// Combine the subfields
				for (var i in stepObject.npcs) {
					npcs.add(stepObject.npcs[i].name);	
				}

				for (var i in stepObject.locations) {
					locations.add(stepObject.locations[i].name);	
				}

				for (var i in stepObject.groups) {
					groups.add(stepObject.groups[i].name);	
				}

				// Create the return object
				var returnObject = {"adventureSteps": adventureSteps, "adventureDetails": adventureDetails, "backup": backup, "npcs": npcs, "locations": locations, "groups": groups};
				return adventureDetailsPromise(returnObject);
			} catch (err) {
				console.log("------------------------------retrying");
				return adventureDetailsPromise(message);
			}
	});
}

function removeSession() {
	const regex = /(?:(the|a|an) +)/g; 
	const subst = ` `;
  var sessionSelect = document.querySelector('#session-selection');
  var session = sessionSelect.value;

var sessionN = get("", "currentSession");
var sessionName = sessionN.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[\W_]+/g,'');
  var arr = []; // Array to hold the keys
  
	console.log("removing sessino: " + sessionName);
  // Iterate over localStorage and insert the keys that meet the condition into arr
  for (var i = 0; i < localStorage.length; i++){
    if (localStorage.key(i).includes(sessionName)) {
      arr.push(localStorage.key(i));
    }
  }

  // Iterate over arr and remove the items by key
  for (var i = 0; i < arr.length; i++) {
    console.log("removing: " + arr[i]);
    localStorage.removeItem(arr[i]);
  }
  
  // Remove the session from the drop down
  $("#session-selection option[value='" + session + "']").remove();
  
  // Remove from the session array
  var sessionArray = JSON.parse(localStorage.getItem("sessions"));
  
  const index = sessionArray.indexOf(session);
  
  const x = sessionArray.splice(index, 1);
  
  localStorage.setItem("sessions", JSON.stringify(sessionArray));
  
  var focusedSession = sessionSelect.value;
  changeSession(focusedSession);
  localStorage.setItem("currentSession", focusedSession);
}

function resetSession() {
	const regex = /(?:(the|a|an) +)/g; 
	const subst = ` `;
  var sessionSelect = document.querySelector('#session-selection');
  var session = sessionSelect.value;

var sessionN = get("", "currentSession");
var sessionName = sessionN.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[\W_]+/g,'');
  var arr = []; // Array to hold the keys
  
	console.log("removing sessino: " + sessionName);
  // Iterate over localStorage and insert the keys that meet the condition into arr
  for (var i = 0; i < localStorage.length; i++){
    if (localStorage.key(i).includes(sessionName)) {
      arr.push(localStorage.key(i));
    }
  }

  // Iterate over arr and remove the items by key
  for (var i = 0; i < arr.length; i++) {
    console.log("removing summaries: " + arr[i]);
 	try {
		var savedObj = localStorage.getItem(arr[i]);
		var savedjson = JSON.parse(savedObj);
		if ("hot-summary" in savedjson) savedjson["hot-summary"] = "";
		if ("cold-summary" in savedjson) savedjson["cold-summary"] = "";
	} catch {
		// do nothing	
	}
  }
	
	localStorage.setItem(sessionName + "." + "hotsummary", "");
	localStorage.setItem(sessionName + "." + "coldsummary", "");
	localStorage.setItem(sessionName + "." + "log", "");
	localStorage.setItem(sessionName + "." + "lastturn", "");
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
	   set("", "currentSession", sessionName);
	   
	   console.log(sessionName);
	   // Update the player list
	   $("#player-list").empty();
	    var playerArray = JSON.parse(get(sessionName, "player-characters"));
	    var playerList = $("#player-list")

	    for (i in playerArray) {
		console.log(JSON.stringify(playerArray));
		console.log(playerArray[i]);
		var player = createPlayerElement(sessionName, playerArray[i]);
		playerList.append(player);
	    }

	    // Select the current player
		console.log(sessionName + ".current-player");
	    var currentPlayerName = get(sessionName, "current-player");
	     console.log(currentPlayerName);
	    if (currentPlayerName) {
		changePlayer({data:{sessionName:sessionName, playerName: currentPlayerName}});
	    } else {
		if (partyTrees && partyTrees["player"]) {
			jsonview.destroy(partyTrees["player"]);
			delete partyTrees["player"];
		}
	    }

		prepAdventure(sessionName);
   }
}

function prepAdventure(sessionName) {
	console.log("preparing adventure");
	var chatlog = get(sessionName, "log");
	if (chatlog) {
		$( "#text-response-field" ).html(chatlog);
		$( "#text-submit-area" ).show();
		$( "#text-submit-button" ).show();
		$( "#start-adventure-button" ).hide();
		
		response = get(sessionName, "last-turn");
		$( "#turn-number" ).text(response["turn"]);
	
		var location = response["location"];
		if (location) {
			$( "#location-field" ).text(location);
		}
	} else {
		$( "#text-response-field" ).html("Press the button below to begin your adventure");
		$( "#text-submit-area" ).hide();
		$( "#text-submit-button" ).hide();
		$( "#start-adventure-button" ).show();
		
		$( "#poi-field" ).html("");
		$( "#location-field" ).text("");
		$( "#turn-number" ).text("0");
	}
}

function initializeNewCharacterCreation(sessionName) {
  var characterCreationSteps = get(sessionName, "character-creation-steps");
  if (!characterCreationSteps) {
     var setting = get(sessionName, "setting");
     var mechanics = get(sessionName, "mechanics");
     var messages = [{"role":"user", "content": "For the " + setting + " setting using the " + mechanics + " rule set, list out succinctly the steps for character creation, format it as a JSON array of strings, no new lines"}];
     prompt(messages).then(function(msg){
            console.log(msg);
            var characterCreationSteps = msg;
            console.log(characterCreationSteps);
            set(sessionName, "character-creation-steps", characterCreationSteps);
            var firstStep = characterCreationSteps[0];
            var firstStepMessage = [{"role":"user", "content": "Provide a detailed description of the first step of character creation, " + firstStep + ", using the " + mechanics + " in the " + setting + " setting. Provide a description of the options. Format everything using html code."}];
            prompt(firstStepMessage).then(function(msg) {
              var firstStep = msg;
              console.log(firstStep);
              set(sessionName, "character-creation-first-step", firstStep);
              $("#new-player-text").html(firstStep);
            });
     });
  } else {
    var firstStep = get(sessionName, "character-creation-first-step");
    $("#new-player-text").html(firstStep);
  }
}

function nextPlayerCreationStage() {
	console.log("next player creation stage");
  var sessionName = get("", "currentSession");

  var setting = get(sessionName, "setting");
  var mechanics = get(sessionName, "mechanics");

  // Get the current player creation stage
  var stage = Number(get(sessionName, "player-creation-stage"));
  
  // Increment the stage to pull in the prompt for the second stage.
  stage = stage + 1;
  
  var character_creation_steps = JSON.parse(get(sessionName, "character-creation-steps"));

  console.log(JSON.stringify(character_creation_steps));
  console.log(stage);
  console.log(character_creation_steps.length);

  // Only do something if we haven't reached the end of the stages.
  if (stage <= character_creation_steps.length + 2) {
  
    // Save the new stage number
    set(sessionName, "player-creation-stage", stage);
  
    // Get the stage text for the next stage
    var stageText = character_creation_steps[stage];
    
    // Get the decisions made so far during player creation
    var characterDecisions = get(sessionName, "player-creation-decisions");
    
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
    set(sessionName, "player-creation-decisions", JSON.stringify(characterDecisions));
	  
    if (stage < character_creation_steps.length) {
	    // Append all the decisions so far
	    var characterString = characterDecisions.join();

	    // Create new message to send to chatGPT
	    var message = [{"role":"user", "content": "I am " + characterString + ". With that in mind, provide a detailed description of this next step of character creation: " + stageText + ", using the " + mechanics + " rules in the " + setting + " setting. Provide a description of the options. Format everything using html code."}];

	    console.log(JSON.stringify(message));
	    // Send prompt
	    prompt(message).then(function(msg) {
	      var nextStep = msg;
	      console.log(JSON.stringify(msg));
	      console.log(nextStep);

	      $("#new-player-text").html(nextStep);
	    });
    } else if (stage == character_creation_steps.length){
	   $("#new-player-text").html("<h2>What is your character's name?</h2>"); 
    } else if (stage == (character_creation_steps.length + 1 )) {
	   // Save the character name in a temporary variable
	   console.log("----------------------------" + input);
	   set(sessionName, "player-creation-name", input);
           $("#new-player-text").html("<h2>What is your character's background?</h2>"); 
    } else {
	   // Save the character background in a temporary variable
	    console.log("----------------------------" + input);
	   set(sessionName, "player-creation-background", input);
	    
	    // Append all the decisions so far
	    var characterString = characterDecisions.join();
	    
	    console.log(characterString);
	    // Create new message to send to chatGPT
	    var message = [{"role":"user", "content": "create a " + mechanics + " character sheet for: " + characterString + ". Provide counts for inventory items. Include the number of expendable slots, for example spell slots or skills that have a limited number of uses. Include other features or attributes commonly associated with this type of character that was not listed above, assign values to these."}];
            prompt(message).then(function(msg) {
	      var characterSheet = msg;
	      console.log(JSON.stringify(msg));
	      console.log(characterSheet);
		    
	      var csmessage = [{"role":"user", "content": "convert this character sheet to a JSON object: " + characterSheet}];
            
	      prompt(csmessage).then(function(msg) {
	      	var characterSheet = msg;
	      	console.log(characterSheet);
		
		      
		$("#new-player-text").html(characterSheet);
                // Save the player JSON
                set(sessionName, "player-creation-json", characterSheet);
		      
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
	var name = get(sessionName, "player-creation-name");
	var background = get(sessionName, "player-creation-background");
	var json = get(sessionName, "player-creation-json");
	
	console.log("-name---------------------------" + name);
	console.log("-background---------------------------" + background);
	console.log("-json---------------------------" + json);
	
	// Create the player character object
	var playerObject = {"background":background, "json":JSON.parse(json)};
	
	console.log("----------------------Testing--------------------");
	console.log(name);
	console.log(playerObject);
	// Save the player character object
	set(sessionName, name, JSON.stringify(playerObject));
	
	// Add the player character to the list of available player characters
	var playerCharacters = get(sessionName, "player-characters");
	
	if (!playerCharacters) {
		playerCharacters = [name];	
	} else {
		playerCharacters = JSON.parse(playerCharacters);
		playerCharacters.push(name);
	}
	
	// Save the new list of player characters
	set(sessionName, "player-characters", JSON.stringify(playerCharacters));
	
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
	set(sessionName, "current-player", playerName);
	
	// Enable the player tree
	var playerObject = JSON.parse(get(sessionName, playerName));
	
	// remove the current player tree
	if (partyTrees && partyTrees["player"]) {
		jsonview.destroy(partyTrees["player"]);
		delete partyTrees["player"];
	}
	
	// create json tree object
	var partyObject = {};
	partyObject[playerName] = playerObject.json;
	const tree = jsonview.create(partyObject);
	
	// render tree into dom element
	jsonview.render(tree, document.querySelector('#player-tree'));
	
	// render the party tree
	
	// set the new tree as the current player tree
	partyTrees["player"] = tree;
}

function renderParty() {
	var sessionName = get("", "currentSession");
	console.log("rendering party");
	
	var party = JSON.parse(get(sessionName + ".group", "party"));
console.log(party);
	if (party) {
		var partyNPCs = party["notable-npcs"];
		console.log(partyNPCs);
		if (partyNPCs) {
			var partyObject = {};
			// remove the current character tree
			if (partyTrees && partyTrees[partyNPCs[i]]) {
				jsonview.destroy(partyTrees["party"]);
				delete partyTrees["party"];
			}
			
			for (var i in partyNPCs) {
				console.log(partyNPCs[i]);
				var npcObject = JSON.parse(get(sessionName + ".npc", partyNPCs[i]));

				if (npcObject) {
					partyObject[partyNPCs[i]] = npcObject;
				}
			}
			
			console.log(partyObject);
			const tree = jsonview.create(partyObject);
			jsonview.render(tree, document.querySelector('#player-tree'));
			
			partyTrees["party"] = tree;
		}
	}
}

function editPlayer(event) {
	var sessionName = event.data.sessionName;
	var playerName = event.data.playerName;
	set(sessionName, "editPlayer", playerName);
	
	// Populate the edit field
	var playerObject = JSON.parse(get(sessionName, playerName));
	
	var playerString = JSON.stringify(playerObject, null, 4);
	$("#player-edit-text-area").text(playerString);
	
	
	// Show player edit modal
	$("#player-edit-modal").show();
}

function modifyPlayer(changeObject) {
	var sessionName = get("", "currentSession");
	var playerName = get(sessionName, "current-player");
	
	var fullPlayerObject = JSON.parse(get(sessionName, playerName));
	var playerObject = fullPlayerObject["json"];
	
	fullPlayerObject["json"] = changePlayerRecursive(playerObject, changeObject);
	
	console.log(fullPlayerObject);
	
	set(sessionName, playerName, JSON.stringify(fullPlayerObject));
	
	changePlayer({data:{sessionName:sessionName, playerName: playerName}});
}
		     
function changePlayerRecursive(playerObject, changeObject) {
	console.log("ENTERING THE RECURSIVE METHOD");
	console.log(changeObject);
	if (playerObject) {
		var playerType = typeof playerObject;
		var changeType = typeof changeObject;
		if (playerType == changeType) {
			if (changeType == "object") {
				if (isArray(changeObject)) {
					console.log("MODIFYING ARRAY: returning " + changeObject);
					// If an array return the changed version
					return changeObject;
				} else {
					// Loop over the keys and recurse
					const keys = Object.keys(changeObject);
					console.log(keys);
					for (var i in keys) {
						var key = keys[i]
						var keyValue = changePlayerRecursive(playerObject[key], changeObject[key]);
						console.log("MODIFYING: " + key + " - " + keyValue);
						playerObject[key] = keyValue;
					}
					return playerObject;
				}
			} else {
				// If a primitive value return the changed version
				
				console.log("MODIFYING PRIMITIVE: returning " + changeObject);
				return changeObject;
			}
		} else {
			console.log("ERROR: Not matching types - " + JSON.stringify(playerObject) + "  -  " + JSON.stringify(changeObject));
			// return the unchanged player object
			return playerObject;
		}
	} else {
		console.log("MODIFYING ADING: " + changeObject);
		return changeObject;	
	}
}

function isArray(myArray) {
  return myArray.constructor.toString().indexOf("Array") > -1;
}

function removePlayer(event) {
	var sessionName = event.data.sessionName;
	var playerName = event.data.playerName;
	set(sessionName, "removePlayer", playerName);
	
	// Show player removal modal
	$("#player-removal-modal").show();
	$("#player-removal-modal").css('opacity', '1.0');
	
	$("#player-removal-form").show();
	$("#player-removal-form").css('opacity', '1.0');
	$("#player-removal-form").css('scale', '1.0');
}

function removePlayerButton() {
	var sessionName = get("","currentSession");
	var playerName = get(sessionName, "removePlayer");
	console.log("removing players");
	
	// Remove the player character from the list of available player characters
	var playerCharacters = JSON.parse(get(sessionName, "player-characters"));
	playerCharacters.splice(playerCharacters.indexOf(playerName), 1);
	set(sessionName, "player-characters", JSON.stringify(playerCharacters));
	
	// Remove the player objct
	remove(sessionName,playerName);

	// Remove player from the list on the page
	$("#" + playerName.replace(/\s+/g, '') + "-list-item").remove();
	
	// reset remove player field
	set(sessionName, "removePlayer", "");
}

function editPlayerButton() {
	var sessionName = get("","currentSession");
	var playerName = get(sessionName, "editPlayer");
	console.log("editing player " + playerName);
	
	// Get the modified player text
	var modifiedPlayer = $("#player-edit-text-area").val();
	
	var modifiedPlayerObject = JSON.parse(modifiedPlayer);
	
	// Save modified player
	set(sessionName, playerName, JSON.stringify(modifiedPlayerObject));
	
	changePlayer({data:{sessionName:sessionName, playerName: playerName}});
}

function set(prefix, name, value) {
	const regex = /(?:(the|a|an) +)/g; 
	const subst = ` `;

	var cleanedName = name.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[\W_]+/g,'');
	var cleanedPrefix = prefix.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9\.]+/g,'');
	
	var keyName = cleanedPrefix + "." + cleanedName;

	if (!prefix) {
		keyName = cleanedName;
	}
	  // Iterate over localStorage and save the keys that meet the condition
	if (localStorage.getItem(keyName) === null) {
	  for (var i = 0; i < localStorage.length; i++){
	    if (localStorage.key(i).includes(cleanedPrefix) && localStorage.key(i).includes(cleanedName)) {
	       keyName = localStorage.key(i);
	    }
	  }
	}
	
	console.log("setting key: " + keyName);
	return localStorage.setItem(keyName, value);
}

function get(prefix, name) {
	console.log("Prefix: " + prefix);
	console.log("Name: " + name);
	const regex = /(?:(the|a|an) +)/g; 
	const subst = ` `;
	
	if (!name) return null;

	var cleanedName = name.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[\W_]+/g,'');
	var cleanedPrefix = prefix.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9\.]+/g,'');
	
	var keyName = cleanedPrefix + "." + cleanedName;
	
	if (!prefix) {
		keyName = cleanedName;
	}
	  // Iterate over localStorage and save the keys that meet the condition
	if (localStorage.getItem(keyName) === null) {
	  for (var i = 0; i < localStorage.length; i++){
	    if (localStorage.key(i).includes(cleanedPrefix) && localStorage.key(i).includes(cleanedName)) {
	       keyName = localStorage.key(i);
	    }
	  }
	}
	
	console.log("getting key: " + keyName);
	return localStorage.getItem(keyName);
}

function search(name) {
	console.log("Search: " + name);
	const regex = /(?:(the|a|an) +)/g; 
	const subst = ` `;

	var cleanedName = name.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[\W_]+/g,'');
	
	var matches = new Set();
	  for (var i = 0; i < localStorage.length; i++){
	    if (localStorage.key(i).includes(cleanedName)) {
		    console.log(localStorage.key(i));
	       matches.add(localStorage.getItem(localStorage.key(i)));
	    }
	  }
	
	return [...matches];
}

function remove(prefix, name) {
	const regex = /(?:(the|a|an) +)/g; 
	const subst = ` `;

	var cleanedName = name.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[\W_]+/g,'');
	var cleanedPrefix = prefix.toLowerCase().replace(regex, subst).trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9\.]+/g,'');
	
	var keyName = cleanedPrefix + "." + cleanedName;
	
	if (!prefix) {
		keyName = cleanedName;
	}
	  // Iterate over localStorage and save the keys that meet the condition
	if (localStorage.getItem(keyName) === null) {
	  for (var i = 0; i < localStorage.length; i++){
	    if (localStorage.key(i).includes(cleanedPrefix) && localStorage.key(i).includes(cleanedName)) {
	       keyName = localStorage.key(i);
	    }
	  }
	}
	
	return localStorage.removeItem(keyName);
}

function compressSummary(response) {
	return new Promise((resolve) => {
		if (response.status == 400 || response.usage.total_tokens > 3750) {
			var sessionName = get("","currentSession");
			var coldSummary = get(sessionName, "cold-summary");
			var hotSummary = get(sessionName, "hot-summary");
			
			// If the cold summary has grown too large compress it
			if (coldSummary && coldSummary.length > hotSummary.length) {
				console.log("compressing cold-summary");
				var message = "Create a concise summary of this: " + coldSummary;
				var messages = [{"role":"user", "content": message}];
				gptQuery(messages).then(extractMessage).then((message) => {
					console.log("setting compressed summary");
					set(sessionName, "cold-summary", message);
					resolve(response);
				});
			} else {
				console.log("compressing hot-summary");
				var message = "Create a concise summary of this: " + hotSummary;
				var messages = [{"role":"user", "content": message}];
				gptQuery(messages).then(extractMessage).then((message) => {
					console.log("setting compressed summary");
					set(sessionName, "cold-summary", coldSummary + " " + message);
					set(sessionName, "hot-summary", "");
					resolve(response);
				});
			}
		} else {
			console.log("summary is short enough");
			resolve(response);	
		}
	});		
}

function extractMessage(data) {
	return new Promise((resolve) => {
	     console.log(JSON.stringify(data));

	     var messages = data.choices[0].message.content;

	     if (messages.includes("}")) {
		     var lastIndex = messages.lastIndexOf("}");
		     if (lastIndex < messages.length - 3) {
			messages = messages.substr(0, lastIndex+1).trim(); 
		     }
		}
	 	resolve(messages);
	});	
	
}

function prompt(messages) {
	return gptQuery(messages).catch(compressSummary).then(compressSummary).then(extractMessage);
}

function gptQuery(messages) {
	return new Promise((resolve, reject) => {
	  var token = get("", "openai-key");
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
	     success: function (data) {
		     console.log(JSON.stringify(data));
       		 resolve(data);
     		 },
      error: function (error) {
        reject(error);
      }
	  });
 });
}
