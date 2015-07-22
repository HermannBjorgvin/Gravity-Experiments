// modules/spacetime

define([
	'jquery',
	'underscore'
], function($, _){
	
	/**************
		Private
	**************/

	var spacetime = []; // If this were real life we'd just call this variable "the universe"

	// Simulation settings
	var calculationsPerSec = 100; // How many gravitational calculations are performed a second
	var calculationSpeed = 1; // Speed comes at the cost of accuracy
	var massMultiplier = undefined; // How exaggerated the size of the objects are (humans like that)

	var spacetimeLoop; // Variable that stores our setInterval loop

	function getVelocity(object){
		var velocity = Math.sqrt(Math.pow(object.velX, 2)+Math.pow(object.velY, 2));

		return velocity;
	}

	function getMomentum(object){
		var velocity = getVelocity(object);

		return velocity * object.mass;
	}

	function pythagoras(objectA, objectB){
		var distance = Math.sqrt(
			Math.pow(objectA.x - objectB.x, 2) +
			Math.pow(objectA.y - objectB.y, 2)
		);

		return distance;
	}

	function getObjectRadius(object){
		var radius = Math.cbrt(object.mass*object.density*massMultiplier / 4/3*Math.PI);
		
		return radius;
	}

	/*************
		Public
	*************/

	var api = {};

	api.initialize = function(p_massMultiplier){
		massMultiplier = p_massMultiplier;
	}

	api.calculationsPerSec = function(number){
		calculationsPerSec = number;
	}

	api.calculationSpeed = function(number){
		calculationSpeed = number;
	}

	api.updateMassMultiplier = function(p_massMultiplier){
		massMultiplier = p_massMultiplier;
	}
	
	api.addObject = function(object){
		spacetime.push(object);
	}

	api.clearSpacetime = function(){
		spacetime = [];
	}

	api.cycleFocus = function(){
		var objectFound = false;

		for (var i = 0; i < spacetime.length; i++) {
			if(spacetime[i].cameraFocus !== undefined && spacetime[i].cameraFocus === true){
				
				spacetime[i].cameraFocus = false;
				spacetime[((i+1)%spacetime.length)].cameraFocus = true;

				objectFound = true;

				break;
			}
		};

		if (objectFound !== true && spacetime.length > 0) {
			spacetime[0].cameraFocus = true;
		};
	}

	api.startLoop = function(){
		var self = this;

		spacetimeLoop = setInterval(function(){
			self.calculateForces();
		}, 1000/calculationsPerSec);
	}

	api.stopLoop = function(){
		clearInterval(spacetimeLoop);
	}

	api.getSpace = function(){
		return spacetime;
	}

	api.calculateForces = function(){
		var self = this;

		/*
			find colliding objects

			If the objects are localized and clustering they are joined
			but only if they're within each others radius

			If the objects are fast moving and have enough impact force
			(mass times speed) they are broken into several smaller pieces
			
			IMPORTANT NOTE: No momentum can be added, the added momentum
			of two colliding objects should still be the same after they
			break into pieces and scatter around. Be vary of Math.random()

			Google: conservation of momentum formula
			mass * velocity	
		*/

		// Find clustering objects and join them - unfinished
		// THIS IS CURRENTLY PHYSICALLY INACCURATE, WILL FIX SOON
		for (var a = 0; a < spacetime.length; a++){
			var objectA = spacetime[a];
			
			for (var b = 0; b < spacetime.length; b++){
				if (a !== b) {
					var objectB = spacetime[b];

					if (
						pythagoras(objectA, objectB) < getObjectRadius(objectA) + getObjectRadius(objectB)
					){
						var camFocus = false;
						if(objectB.cameraFocus === true || objectA.cameraFocus === true){
							camFocus = true;
						}

						// Splice the objects from 
						spacetime = _.without(spacetime, objectA);
						spacetime = _.without(spacetime, objectB);

						var newMass = objectA.mass + objectB.mass;
						var massRatio = objectA.mass/newMass;

						var newMomentum = getMomentum(objectA) + getMomentum(objectB);

						var newDensity = objectA.density*massRatio + objectB.density*(1-massRatio);

						var newObject = {
							cameraFocus: camFocus,
							x: (objectA.x * objectA.mass + objectB.x * objectB.mass)/newMass,
							y: (objectA.y * objectA.mass + objectB.y * objectB.mass)/newMass,
							velX: (objectA.velX*objectA.mass + objectB.velX*objectB.mass)/newMass, // Change later
							velY: (objectA.velY*objectA.mass + objectB.velY*objectB.mass)/newMass, // Change later
							deltaX:0, // useless info
							deltaY:0, // useless info
							mass: newMass, 
							density: newDensity,
							path: []
						};

						// Give the new object the larger objects previous path, looks nicer
						var newPath = objectA.mass >= objectB.mass ? objectA.path : objectB.path;
						newObject.path = newPath;

						spacetime.push(newObject);
					};
				};
			};
		};

		///////////////////////////////////////////////////////////////////////////////////////////

		// Updates the universe and shit
		for (var a = spacetime.length - 1; a >= 0; a--) {
			var objectA = spacetime[a];
			objectA.deltaX = 0;
			objectA.deltaY = 0;

			// Calculate forces applied to objects
			for (var b = spacetime.length - 1; b >= 0; b--) {
				if (b !== a) {
					var objectB = spacetime[b];

					// Pythagoras
					var distance = Math.sqrt(Math.pow(objectA.x-objectB.x,2)+Math.pow(objectA.y-objectB.y,2));
					
					// Find angle from vector. Fun note, if we reverse objectA and B we have anti-gravity
					var angleToMass = Math.atan2(objectB.y-objectA.y, objectB.x-objectA.x);

					// All credit for this formula goes to an Isaac Newton
					objectA.deltaX += (
						Math.cos(angleToMass) *
						(objectB.mass/Math.max(Math.pow(distance,2), 1))
					);
					objectA.deltaY += (
						Math.sin(angleToMass) *
						(objectB.mass/Math.max(Math.pow(distance,2), 1))
					);
				};
			};
		};

		// Apply changes to objects for this iteration
		for (var i = 0; i < spacetime.length; i++) {
			var object = spacetime[i];

			// add coords to object path
			object.path.push({
				x: object.x,
				y: object.y
			});

			// Limit path length
			if (object.path.length > Math.min(120, getObjectRadius(object) * 20 / getVelocity(object))) {
				object.path.splice(0, 1);
			};
			
			object.velX += object.deltaX * calculationSpeed;
			object.velY += object.deltaY * calculationSpeed;
			
			object.x += object.velX * calculationSpeed;
			object.y += object.velY * calculationSpeed;
		};
	}

	return api;

});
