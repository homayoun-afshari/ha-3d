HaAnimation = class {
	static resistance = 6;
	static elasticity = 20; // if elasticity > 0.25*resistance^2 then we have spring effect
	static delta = .0167; // fps = 1/delta
	static epsilon = 1e-4;

	constructor(targetSetter, targetValues, period, eventListeners=new Map()) {
        this.targetSetter = targetSetter;
        this.targetValues = targetValues;
		this.period = period;
		this.eventListeners = eventListeners;
		this.forceMax = 0;
		this.stop();
	}

	setVelocity(velocity) {
		for (let i = 0; i < this.targetValues.length; i++) {
			if (velocity[i] !== null)
				this.velocity[i] = velocity[i];
		}
		return this;
	}

	setDestination(destination) {
		this.destination = [];
		for (let i = 0; i < this.targetValues.length; i++) {
			this.destination[i] = this.targetValues[i];
			if (destination[i] !== null) {
				if (this.period !== undefined)
					destination[i] = this.targetValues[i] + haFuncGetMinPeriodicDisplacement(this.targetValues[i], destination[i], this.period);
				this.destination[i] = destination[i];
			}
		}
		return this;
	}

	play() {
		if (this.isPlaying)
			return;
		this.isPlaying = true;
		this.animate();
		if (this.eventListeners.has('animationPlay'))
            this.eventListeners.get('animationPlay')({
				currentVelocity: this.velocity,
				currentDestination: this.destination
			});
	}
    
	pause() {
		this.isPlaying = false;
		if (this.eventListeners.has('animationPause'))
			this.eventListeners.get('animationPause')({
				currentVelocity: this.velocity,
				currentDestination: this.destination
			});
	}

	stop() {
		const isPlaying = this.isPlaying;
		this.velocity = haFuncInitializeVector(this.targetValues.length, 0);
		this.destination = undefined;
		this.isPlaying = false;
		if (isPlaying && this.eventListeners.has('animationEnd'))
			this.eventListeners.get('animationEnd')({
				currentVelocity: this.velocity,
				currentDestination: this.destination
			});
	}
    
	animate() {
		let acceleration = haFuncOperateOnVector(this.velocity, x => -HaAnimation.resistance*x);
		if (this.destination !== undefined)
			acceleration = haFuncLinearCombineVectors([acceleration, this.targetValues, this.destination], [1, -HaAnimation.elasticity, HaAnimation.elasticity]);
		this.velocity = haFuncLinearCombineVectors([this.velocity, acceleration], [1, HaAnimation.delta]);
		this.targetSetter(haFuncLinearCombineVectors([this.targetValues, this.velocity], [1, HaAnimation.delta]));
		const force = haFuncGetL2Norm(acceleration);
		this.forceMax = Math.max(this.forceMax, force);
		if (force <= HaAnimation.epsilon*this.forceMax)
			this.stop();
		if (!this.isPlaying)
			return;
		setTimeout(()=> {
			this.animate();
		}, 1000*HaAnimation.delta);
	}
};