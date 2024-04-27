haFuncUcfirst = (string)=> {
	return string.charAt(0).toUpperCase()+string.slice(1);
};

haFuncMudolu = (dividend, divisor)=> {
	return ((dividend % divisor) + divisor) % divisor;
};

haFuncInitializeVector = (dimension, initializer)=> {
	const result = [];
	if (initializer === null || initializer.constructor !== Array)
		initializer = [initializer];
	for (let i = 0; i < dimension; i++)
		result.push(initializer[haFuncMudolu(i, initializer.length)]);
	return result;
};

haFuncGetMinPeriodicDisplacement = (valueA, valueB, period)=> {
	const difference = haFuncMudolu(valueB, period) - haFuncMudolu(valueA, period);
	const displacement = [difference, difference-period, difference+period].reduce((differenceA, differenceB)=> {
		return Math.abs(differenceA) < Math.abs(differenceB) ? differenceA : differenceB
	});
	return displacement
};

haFuncGetL1Norm = (vector)=> {
	let result = 0;
	for (let i = 0; i < vector.length; i++)
		result += Math.abs(vector[i]);
	return result;
};

haFuncGetL2Norm = (vector)=> {
	let result = 0;
	for (let i = 0; i < vector.length; i++)
		result += Math.pow(vector[i], 2);
	return Math.sqrt(result);
};

haFuncGetInnerProduct = (vectorA, vectorB)=> {
	let result = 0;
	for (let i = 0; i < vectorA.length; i++)
		result += vectorA[i]*vectorB[i];
	return result;
};

haFuncGetCrossProduct = (vectorA, vectorB)=> {
	const result = [
		vectorA[1]*vectorB[2] - vectorA[2]*vectorB[1],
		vectorA[2]*vectorB[0] - vectorA[0]*vectorB[2],
		vectorA[0]*vectorB[1] - vectorA[1]*vectorB[0]
	];
	return result;
};

haFuncGetCorrelation = (vectorA, vectorB)=> {
	const result = haFuncGetInnerProduct(vectorA, vectorB)/(haFuncGetL2Norm(vectorA)*haFuncGetL2Norm(vectorB));
	return result;
};

haFuncGetIfPointIsOnLeftOfLine = (linePointA, linePointB, point)=> {
	const result = (linePointA[0]-point[0])*(linePointB[1]-point[1]) > (linePointA[1]-point[1])*(linePointB[0]-point[0]);
	return result
}

haFuncGetIfLinesIntersect = (lineAPointA, lineAPointB, lineBPointA, lineBPointB)=> {
	const numeratorA = lineAPointA[0]*lineBPointA[1] - lineAPointA[1]*lineBPointA[0] - lineAPointA[0]*lineBPointB[1] + lineAPointA[1]*lineBPointB[0] + lineBPointA[0]*lineBPointB[1] - lineBPointA[1]*lineBPointB[0]	;
	const numeratorB = lineAPointA[0]*lineBPointA[1] - lineAPointA[0]*lineAPointB[1] + lineAPointA[1]*lineAPointB[0] - lineAPointA[1]*lineBPointA[0] - lineAPointB[0]*lineBPointA[1] + lineBPointA[0]*lineAPointB[1];
	const denominator = lineAPointA[0]*lineBPointA[1] - lineAPointA[1]*lineBPointA[0] - lineAPointA[0]*lineBPointB[1] + lineAPointA[1]*lineBPointB[0] - lineAPointB[0]*lineBPointA[1] + lineBPointA[0]*lineAPointB[1] + lineAPointB[0]*lineBPointB[1] - lineAPointB[1]*lineBPointB[0];
	const ratioA = numeratorA/denominator;
	const ratioB = numeratorB/denominator;
	const result = [
		ratioA >=0 && ratioA <=1 && ratioB >=0 && ratioB <=1,
		ratioA,
		ratioB,
		haFuncLinearCombineVectors([lineAPointB, lineAPointA], [ratioA, 1-ratioA])
	];
	return result
};

haFuncGetLinePlaneIntersection = (lineCoordinatesA, lineCoordinatesB, planeAxis, planeAnchorCoordinates)=> {
	const numerator = haFuncGetInnerProduct(planeAxis, haFuncLinearCombineVectors([planeAnchorCoordinates, lineCoordinatesA], [1, -1]));
	const denominator = haFuncGetInnerProduct(planeAxis, haFuncLinearCombineVectors([lineCoordinatesB, lineCoordinatesA], [1, -1]));
	const ratio = numerator/denominator;
	const result = [ratio, haFuncLinearCombineVectors([lineCoordinatesB, lineCoordinatesA], [ratio, 1-ratio])];
	return result;
};

haFuncBroadcastVectorToVectors = (vector, vectors)=> {
	const result = [];
	for (let i = 0; i < vectors.length; i++)
		result.push(haFuncLinearCombineVectors([vector, vectors[i]], [1, 1]));
	return result;
};

haFuncOperateOnVector = (vector, operation)=> {
	const result = [];
	for (let i = 0; i < vector.length; i++)
		result.push(operation(vector[i]));
	return result;
};

haFuncLinearCombineVectors = (vectors, coefficients)=> {
	const result = [];
	for (let i = 0; i < coefficients.length; i++)
		for (let j = 0; j < vectors[i].length; j++) {
			if (result[j] === undefined)
				result[j] = 0;
			result[j] += coefficients[i]*vectors[i][j];
		}
	return result;
};