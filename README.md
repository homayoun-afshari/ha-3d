# 3D World Framework
<p align="center">
	<img src="demo/01.PNG" height="200px">&#9;<img src="demo/02.PNG" height="200px">&#9;<img src="demo/03.PNG" height="200px">
</p>
This framework provides all the tools you need to create a 3D world in your browser, well, of course, within the limits the HTML, CSS, and JavaScript. You don’t need any fancy plugins or expensive dependencies; this framework is based on vanilla JavaScript and can be easily integrated into your projects. The following is a summary of its capabilities:
1. Creation of multiple 3D worlds on the same page;
2. Creation of multiple 3D objects;
3. Creation of multiple omni-directional lights;
4. Lighting calculation and shade creation;
5. And last, but not least, efficient shadow calculations;

But that’s not all that the 3D World Framework is capable of. It’s also designed to be interactive. You can move, rotate, resize objects or drag light sources around, while observing the real-time effects with the help of a super-fast physics calculation.  Just clone this repo or check out the following figures.
<p align="center">
	<img src="demo/01.gif" height="200px">&#9;<img src="demo/02.gif" height="200px">
</p>

# Installation
All you need to do is adding following files to your project:
1. [haFunctions.js](haFunctions.js). It contains general functions required for physics calculations, e.g., `haFuncGetL2Norm` to compute the L2 norm of a vector or `haFuncLinearCombineVectors` to linearly combine vectors according to specified weights.
2. [haAnimation.js]( haAnimation.js). It contains the `HaAnimation` class, which represents an animation wrapper around a vector. The animation can be controlled using `setVelocity` and `setDestination` methods dynamically. Other methods, such as`play`, `pause`, or `stop, control the playback of the animation.
3. [ha3d.css](ha3d.css). It contains the basic CSS properties of a 3D world. Its content is better left unchanged, unless you really want to make some special modifications to the framework.
4. [ha3d.js]( ha3d.js). This JavaScript file is the heart of the 3D World Framework, where the actual magic happens. It contains multiple classes and functions used to create this framework. Later, I’ll explain them in more detail.

# Usage


# More On What’s Happening Behind the Scenes

