# 3D World Framework
<p align="center">
	<img src="demo/01.PNG" height="200px">&#9;<img src="demo/02.PNG" height="200px">&#9;<img src="demo/03.PNG" height="200px">
</p>
This framework provides all the tools you need to create a 3D world in your browser, well, of course, within the limits the HTML, CSS, and JavaScript. You don't need any fancy plugins or expensive dependencies; this framework is based on vanilla JavaScript and can be easily integrated into your projects. The following is a summary of its capabilities:
1. Creation of multiple 3D worlds on the same page;
2. Creation of multiple 3D objects;
3. Creation of multiple omni-directional lights;
4. Lighting calculation and shade creation;
5. And last, but not least, efficient shadow calculations;

But that's not all that the 3D World Framework is capable of. It's also designed to be interactive. You can move, rotate, resize objects or drag light sources around, while observing the real-time effects with the help of a super-fast physics calculation.  Just clone this repo or check out the following figures.
<p align="center">
	<img src="demo/01.gif" height="200px">&#9;<img src="demo/02.gif" height="200px">
</p>

# Installation
All you need to do is adding following files to your project:
1. [haFunctions.js](haFunctions.js). It contains general functions required for physics calculations, e.g., `haFuncGetL2Norm` to compute the L2 norm of a vector or `haFuncLinearCombineVectors` to linearly combine vectors according to specified weights. The functions are quite descriptive and perform basic matrix operations that are not supported by the `Math` library.
2. [haAnimation.js](haAnimation.js). It contains the `HaAnimation` class, which represents an animation wrapper around a vector. The animation can be controlled using `setVelocity` and `setDestination` methods dynamically. Other methods, such as `play`, `pause`, or `stop`, control the playback of the animation.
3. [ha3d.css](ha3d.css). It contains the basic CSS properties of a 3D world. Its content is better left unchanged, unless you really want to make some special modifications to the framework.
4. [ha3d.js](ha3d.js). This JavaScript file is the heart of the 3D World Framework, where the actual magic happens. It contains multiple classes and functions used to create this framework. In the <a href="https://github.com/homayoun-afshari/ha-3d/blob/main/README.md#more-on-whats-happening-behind-the-scenes">last section</a>, I'll explain them in more detail.

# Creation
In order to create a 3D world, first you need to create a 3D canvas, which is just a preferably empty `div` element labeled with `ha3d` as one its classes. That's it, you now have a 3D canvas at your disposal! You can create as many 3D canvases as you want, as long as you properly define them inside your HTML code. Now, to add entities to a 3D canvas, you need to get it in JavaScript. At first, it may look like a simple DOM element, but that's not even remotely what it's capable of! This DOM element is now equipped with the following methods:
1. `makeHa3dWorld()`. With this method, you can now create a 3D world, which is in fact a JavaScript object that is an instance of the `Ha3dEntity` class.
2. `makeHa3dObject(type)`. It creates a 3D object inside your 3D world. The argument `type` specifies the type of the object that you want to create. The object itself is another JavaScript object that is also an instance of the `Ha3dEntity` class. Currently, valid values for `type` are 'plane', 'cylindroid, 'box', and 'light'.

Now, as you might have guessed, you can use the methods of the `Ha3dEntity` class to manage a 3D world or a 3D object inside it. These methods are as follows:
1. `setFeatureValues(name, values, isControlled=false)`. It selects a feature of the 3D entity and sets its values. I'll explain the argument `name` a bit later. The argument `values` is an array of values with a size that relies on the feature. To avoid changing a single value, you can set it as `null`. The argument `isControlled` specifies if the feature is controlled by an external controlled or not. Now, regarding the argument `name`, 
	- For a 3D world object, valid values are 'perspective' (1-dimensional) or ‘cameraAngles' (3-dimensional).
	- For a 3D object, valid values are 'rgba' (4-dimensional), ‘coordinates' (3-dimensional), ‘sizes' (3-dimensional), or ‘eulerAngles' (3-dimensional).
2. `setFeatureLimiter(name, externalLimiter)`. It selects a feature of the 3D entity and assigns a limiter function to it. The argument `name` is the name of the feature. The argument `externalLimiter` is the limiter function that receives the values of the feature as an array and re-assigns the corrected values to it.
3. `setFeatureControllers(name, domControllers)`. It selects a feature of the 3D entity and assigns external controllers to it. The argument `name` is the name of the feature. The argument `domControllers` is an array of DOM inputs with a size that relies on the feature. To avoid assigning a controller to a single value, you can set it as `null`.
4. `setEventListener(title, callback)`. It sets an event listener for the 3D entity. The argument `tile` is the name of the event listener. The argument `callback` is the callback that is executed when the event happens. Currently, valid values for `title` are '<featureName>Change', 'faceShadeChange', 'faceVisibilityChange', 'receivedShadowChange', 'castShadowChange', 'causedShadowChange', 'animationPlay', 'animationPause', and 'animationEnd'.
5. `unsetEventListener(title)`. It cancels an event listener that is previously set for the 3D entity. The argument `tile` is the name of the event listener.
6. `setInteraction(targetFeatureName, parameters={})`. It selects a feature of the 3D entity and enables mouse interactions for it. The argument `targetFeatureName` is the name of the feature. The argument `parameters` is a dictionary of interaction parameters. Its possible keys are `hasAnimaion`, `actionPlane`, and `returnCoordinates`. The `hasAnimaion` key receives a Bollean value and specifies if the interaction ends smoothly or not. The `actionPlane` specifies the 3D plane where the interaction is subjected to it. The `returnCoordinates` defines a default value of the feature after the interaction ends.
7. `unsetInteraction()`. It selects a feature of the 3D entity and disables mouse interactions that are previously set for it. The argument `targetFeatureName` is the name of the feature.
8. `setFaceInnerHtml(faceIndex, innerHtml)`. It selects a face of the 3D entity and sets its content. The argument `faceIndex` is the index of the face. The argument `innerHtml` is the content considered for the face.
9. `unsetFaceInnerHtml()`. It selects a face of the 3D entity and resets its content to its default value, which is the face index.

For more information, you can refer to [main.js](main.js). It contains a sample of what I just explained.

# More On What's Happening Behind the Scenes
As I said earlier, [ha3d.js](ha3d.js) is the heart of this framework. It contains classes and functions that make the 3D World Framework possible:
1. The `Ha3dEntity` class represents any 3D entity inside this framework and contains all the methods I explained in the previous section. However, this class cannot be instantiated directly, as it's a super-class for all other classes in this file.
2. The `Ha3dWorld` class extends the `Ha3dEntity` class and represents a 3D world. This class is instantiated whenever a 3D world is needed in the code.
3. The `Ha3dObject` class extends the `Ha3dEntity` class and represents a 3D object inside a 3D world. This class is also a super-class itself and cannot be directly instantiated.
4. The ` Ha3dPlane`, ` Ha3dCylindroid`, ` Ha3dBox`, and ` Ha3dLight` classes extend the `Ha3dObject` class and directly represent the 3D objects, which are instantiated whenever a 3D object is created in the code.
5. The functions perform advanced geometrical operations such as coordinates mapping or convex envelope search.
