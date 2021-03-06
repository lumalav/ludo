var greenInitialPositions = [
    [2, 3],
    [3, 2],
    [3, 4],
    [4, 3]
];
var redInitialPositions = [
    [11, 3],
    [12, 2],
    [12, 4],
    [13, 3]
];
var yellowInitialPositions = [
    [2, 12],
    [3, 11],
    [3, 13],
    [4, 12]
];
var blueInitialPositions = [
    [11, 12],
    [12, 11],
    [12, 13],
    [13, 12]
];
var enemyCubes = [],
    playerCubes = [],
    collidableMeshList = [];
var scene, camera, renderer, initialPosition;
var isTweening = false,
    gameStarted = false,
    isMoving = false,
    playersTurn = true,
    musicPlaying = true;
var boardSize = 150,
    gridSize = 15,
    step = boardSize / gridSize;
var selected;
var greens = 4,
    reds = 4,
    yellows = 4,
    blues = 4;
var diceResult = 0;
var music, boing, cheer;

function init() {
    loadSounds();
    // Display instructions
    $('#myModal').modal({
        backdrop: 'static',
        keyboard: true
    }).show();
    // create a scene, that will hold all our elements such as objects, cameras and lights.
    scene = new THREE.Scene();

    // create a camera, which defines where we're looking at.
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);

    // create a render, sets the background color and the size
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x000000, 1.0);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // create the ground plane
    var planeGeometry = new THREE.PlaneGeometry(boardSize, boardSize, 40, 40);
    var planeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff
    });
    planeMaterial.map = THREE.ImageUtils.loadTexture("board.png")

    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.name = 'plane';
    plane.receiveShadow = true;

    scene.add(plane);

    // position and point the camera to the center of the scene
    camera.position = plane.position;
    camera.position.z = 250;

    initialPosition = plane.position.clone();
    initialPosition.add(new THREE.Vector3(-boardSize / 2, boardSize / 2, 0));

    //create the cubes        
    createCubes();

    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('touchstart', onDocumentTouchStart, false);

    // add directionlight for general illumination
    var directionalLight = new THREE.DirectionalLight({
        color: 0xaaaaaa
    });
    directionalLight.castShadow = true;
    directionalLight.position.set(0, 50, 50);
    directionalLight.intensity = 1;

    scene.add(directionalLight);

    // add the output of the renderer to the html element
    document.body.appendChild(renderer.domElement);

    render();
}

function render() {

    if (musicPlaying) {
        music.play();
    } else {
        music.pause();
    }

    // and render the scene
    renderer.render(scene, camera);

    TWEEN.update();

    // render using requestAnimationFrame
    requestAnimationFrame(render);

    if (!gameStarted) {
        removeUnusedPieces();
    }

    if (selected != undefined) {
        move();
    }
}

function detectCollisions() {

    var originPoint = selected.position.clone();
    for (var vertexIndex = 0; vertexIndex < selected.geometry.vertices.length; vertexIndex++) {
        var localVertex = selected.geometry.vertices[vertexIndex].clone();
        var globalVertex = localVertex.applyMatrix4(selected.matrix);
        var directionVector = globalVertex.sub(selected.position);

        var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
        var collisionResults = ray.intersectObjects(collidableMeshList);

        if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() && collisionResults[0].object.color !== selected.color) {

            var position1 = getCubePosition(collisionResults[0].object);
            var position2 = getCubePosition(selected);

            if (position2[0] == selected.currentX && position2[1] == selected.currentY && diceResult == 1) {
                boing.play();
                collisionResults[0].object.position.x = initialPosition.x + collisionResults[0].object.initialPositionX * step;
                collisionResults[0].object.position.y = initialPosition.y - collisionResults[0].object.initialPositionY * step;
                collisionResults[0].object.started = false;
            }

        }
    }
}

function loadSounds() {
    music = new Audio("music.mp3");
    boing = new Audio("boing.wav");
    cheer = new Audio("cheer.wav");
}

function changeMusic() {
    if (musicPlaying) {
        $("#musicIcon").attr('class', 'glyphicon glyphicon-play');
        musicPlaying = false;
    } else {
        $("#musicIcon").attr('class', 'glyphicon glyphicon-pause');
        musicPlaying = true;
    }
}

function initCube() {
    //select the object        
    selected.material.transparent = true;
    selected.material.opacity = 0.5;

    //if its green
    if (selected.color === "green") {
        diceResult--;
        selected.position.x = initialPosition.x + 2 * step - step / 2;
        selected.position.y = initialPosition.y - 7 * step + step / 2;
        selected.started = true;
    }
    //if its red
    if (selected.color === "red") {
        diceResult--;
        selected.position.x = initialPosition.x + 9 * step - step / 2;
        selected.position.y = initialPosition.y - 2 * step + step / 2;
        selected.started = true;
    }
    //if its yellow     
    if (selected.color === "yellow") {
        diceResult--;
        selected.position.x = initialPosition.x + 7 * step - step / 2;
        selected.position.y = initialPosition.y - 14 * step + step / 2;
        selected.started = true;
    }
    //if its blue
    if (selected.color === "blue") {
        diceResult--;
        selected.position.x = initialPosition.x + 14 * step - step / 2;
        selected.position.y = initialPosition.y - 9 * step + step / 2;
        selected.started = true;
    }
}

function throwDice() {
    $("#result").text(Math.floor(Math.random() * 6) + 1);
    diceResult = $("#result").text();
}

function removeUnusedPieces() {
    var enemyColor = $("#enemyTeam").text();
    var playerColor = $("#playerTeam").text();

    if (enemyColor.length < 1 || playerColor.length < 1) return;

    //remove unused and fill enemy and player arrays        
    scene.children.forEach(function (entry) {
        if (entry.name.indexOf("cube") != -1) {
            if (entry.name.indexOf(enemyColor) == -1 && entry.name.indexOf(playerColor) == -1) {
                scene.remove(entry);
            }

            if (entry.name.indexOf(enemyColor) != -1) {
                var found = false;

                if (enemyCubes.length > 0) {
                    enemyCubes.forEach(function (entry2) {
                        if (entry2.name.indexOf(entry.name) != -1) {
                            found = true;
                        }
                    });
                }

                if (!found) {
                    enemyCubes.push(entry);
                    collidableMeshList.push(entry);
                }
            }

            if (entry.name.indexOf(playerColor) != -1) {
                var found = false;

                if (playerCubes.length > 0) {
                    playerCubes.forEach(function (entry2) {
                        if (entry2.name.indexOf(entry.name) != -1) {
                            found = true;
                        }
                    });
                }
                if (!found) {
                    playerCubes.push(entry);
                    collidableMeshList.push(entry);
                }
            }
        }
    });
}

function move() {

    var position = getCubePosition(selected);

    //regular path movement
    if (diceResult > 0) {
        isMoving = true;
        $("#dice").attr('disabled', 'true');
        detectCollisions();
        switch (true) {
            /*Green-Yellow Side*/
            //left and right
            case position[0] > 1 && position[0] <= 6 && position[1] == 9:
                takeStepLeft(selected, selected.position.x, selected.position.x - step, 600);
                break;
            case position[0] >= 1 && position[0] < 6 && position[1] == 7:
                takeStepRight(selected, selected.position.x, selected.position.x + step, 600);
                break;
                //middle for reg colors
            case position[0] == 1 && position[1] <= 9 && position[1] > 7 && selected.name.indexOf("green") == -1:
                takeStepUp(selected, selected.position.y, selected.position.y + step, 600);
                break;
                //middle for green square
            case position[0] == 1 && position[1] <= 9 && position[1] > 8 && selected.name.indexOf("green") != -1:
                takeStepUp(selected, selected.position.y, selected.position.y + step, 600);
                break;
                //jump to Green-red side
            case position[0] == 6 && position[1] == 7 && !isTweening:
                selected.position.x = initialPosition.x + 7 * step - step / 2;
                selected.position.y = initialPosition.y - 6 * step + step / 2;
                diceResult--;
                break;
                //finish line
            case position[0] >= 1 && position[0] < 7 && position[1] == 8 && selected.name.indexOf("green") != -1:
                takeStepRight(selected, selected.position.x, selected.position.x + step, 600);
                break;
                /*Green-Red side*/
                //up and down
            case position[0] == 7 && position[1] <= 6 && position[1] > 1:
                takeStepUp(selected, selected.position.y, selected.position.y + step, 600);
                break;
            case position[0] == 9 && position[1] >= 1 && position[1] < 6:
                takeStepDown(selected, selected.position.y, selected.position.y - step, 600);
                break;
                //middle for reg colors
            case position[0] >= 7 && position[0] < 9 && position[1] == 1 && selected.name.indexOf("red") == -1:
                takeStepRight(selected, selected.position.x, selected.position.x + step, 600);
                break;
                //middle for red square
            case position[0] >= 7 && position[0] < 8 && position[1] == 1 && selected.name.indexOf("red") != -1:
                takeStepRight(selected, selected.position.x, selected.position.x + step, 600);
                break;
                //jump to Red-blue side
            case position[0] == 9 && position[1] == 6 && !isTweening:
                selected.position.x = initialPosition.x + 10 * step - step / 2;
                selected.position.y = initialPosition.y - 7 * step + step / 2;
                diceResult--;
                break;
                //finish line
            case position[0] == 8 && position[1] >= 1 && position[1] < 7 && selected.name.indexOf("red") != -1:
                takeStepDown(selected, selected.position.y, selected.position.y - step, 600);
                break;
                /*Red-Blue side*/
                //right and left
            case position[0] >= 10 && position[0] < 15 && position[1] == 7:
                takeStepRight(selected, selected.position.x, selected.position.x + step, 600);
                break;
            case position[0] <= 15 && position[0] > 10 && position[1] == 9:
                takeStepLeft(selected, selected.position.x, selected.position.x - step, 600);
                break;
                //middle for reg colors
            case position[0] == 15 && position[1] >= 7 && position[1] < 9 && selected.name.indexOf("blue") == -1:
                takeStepDown(selected, selected.position.y, selected.position.y - step, 600);
                break;
                //middle for blue square
            case position[0] == 15 && position[1] >= 7 && position[1] < 8 && selected.name.indexOf("blue") != -1:
                takeStepDown(selected, selected.position.y, selected.position.y - step, 600);
                break;
                //jump to Yellow-blue side
            case position[0] == 10 && position[1] == 9 && !isTweening:
                selected.position.x = initialPosition.x + 9 * step - step / 2;
                selected.position.y = initialPosition.y - 10 * step + step / 2;
                diceResult--;
                break;
                //finish line
            case position[0] <= 15 && position[0] > 9 && position[1] == 8 && selected.name.indexOf("blue") != -1:
                takeStepLeft(selected, selected.position.x, selected.position.x - step, 600);
                break;
                /*Yellow-Blue side*/
                //down and up
            case position[0] == 9 && position[1] >= 10 && position[1] < 15:
                takeStepDown(selected, selected.position.y, selected.position.y - step, 600);
                break;
            case position[0] == 7 && position[1] > 10 && position[1] <= 15:
                takeStepUp(selected, selected.position.y, selected.position.y + step, 600);
                break;
                //middle for reg colors
            case position[0] <= 9 && position[0] > 7 && position[1] == 15 && selected.name.indexOf("yellow") == -1:
                takeStepLeft(selected, selected.position.x, selected.position.x - step, 600);
                break;
                //middle for yellow square
            case position[0] <= 9 && position[0] > 8 && position[1] == 15 && selected.name.indexOf("yellow") != -1:
                takeStepLeft(selected, selected.position.x, selected.position.x - step, 600);
                break;
                //jump to Green-yellow side
            case position[0] == 7 && position[1] == 10 && !isTweening:
                selected.position.x = initialPosition.x + 6 * step - step / 2;
                selected.position.y = initialPosition.y - 9 * step + step / 2;
                diceResult--;
                break;
                //finish line
            case position[0] == 8 && position[1] <= 15 && position[1] > 9 && selected.name.indexOf("yellow") != -1:
                takeStepUp(selected, selected.position.y, selected.position.y + step, 600);
                break;
        }

        detectCollisions();
    } else {
        changePlay();
    }
}

function changePlay() {
    //if the player was the one who played
    if (playersTurn) {
        //release cube, change players turn, and let enemy play
        releaseCube();
        changePlayersTurn();
        enemyPlay();
    } else {
        releaseCube();
        changePlayersTurn();
    }
}

function enemyPlay() {
    throwDice();

    var cubeSelectedNum = Math.floor(Math.random() * enemyCubes.length);

    selected = enemyCubes[cubeSelectedNum];

    if (!selected.started) {
        initCube();
    }
}

function releaseCube() {
    selected.material.opacity = 1;
    selected = undefined;
    $("#result").text(0);
    isMoving = false;
}

function changePlayersTurn() {

    changeDice();

    if (playersTurn) {
        playersTurn = false;
    } else {
        playersTurn = true;
    }
}

function changeDice() {

    var current;

    if (playersTurn) {
        current = $("#enemyTeam").text();
        $("#dice").attr('disabled', 'true');
    } else {
        current = $("#playerTeam").text();
        $("#dice").removeAttr('disabled');
    }

    if (current === "green") {
        $("#dice").attr('class', 'btn btn-success');
    } else if (current === "red") {
        $("#dice").attr('class', 'btn btn-danger');
    } else if (current === "blue") {
        $("#dice").attr('class', 'btn btn-primary');
    } else if (current === "yellow") {
        $("#dice").attr('class', 'btn btn-warning');
    }
}

function getCubeInitialPosition(cube) {
    var result = [];

    var x = (cube.position.x - initialPosition.x) / step;
    var y = (cube.position.y - initialPosition.y) / step;

    result.push(Math.round(x));
    result.push(Math.round(-y));

    return result;
}

function getCubePosition(cube) {
    var result = [];

    var x = (cube.position.x - initialPosition.x + step / 2) / step;
    var y = (cube.position.y - initialPosition.y - step / 2) / step;

    result.push(Math.round(x));
    result.push(Math.round(-y));

    return result;
}

function onDocumentTouchStart(event) {
    event.preventDefault();
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
    onDocumentMouseDown(event);
}

function onDocumentMouseDown(event) {

    event.preventDefault();

    var mouse = new THREE.Vector2();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    var raycaster = new THREE.Raycaster();

    // update the picking ray with the camera and mouse position	
    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {

        var playerTeam = $("#playerTeam").text();

        //return if plane, a piece that does not belong to the player, if its moving, or if the dice has not been thrown
        if (intersects[0].object.name === 'plane' || intersects[0].object.name.indexOf(playerTeam) == -1 || diceResult < 1 || isMoving) {
            return;
        }

        //unselect the previous one
        if (selected != undefined) {
            selected.material.opacity = 1;
        }

        //select the object
        selected = intersects[0].object;
        selected.material.transparent = true;
        selected.material.opacity = 0.5;

        if (intersects[0].object.started == true) return;

        initCube();
    }
}

function createCube(color, x, y, z, name, initx, inity) {
    var cubeGeometry = new THREE.BoxGeometry(step, step, step);
    var cubeMaterial = new THREE.MeshLambertMaterial({
        color: color
    });
    var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.name = name;
    cube.position.x = x;
    cube.position.y = y;
    cube.position.z = z;
    cube.initialPositionX = initx;
    cube.initialPositionY = inity;
    cube.started = false;

    if (name.indexOf("green") != -1) {
        cube.color = "green";
    } else if (name.indexOf("red") != -1) {
        cube.color = "red";
    } else if (name.indexOf("yellow") != -1) {
        cube.color = "yellow";
    } else if (name.indexOf("blue") != -1) {
        cube.color = "blue";
    }

    scene.add(cube);
}

function createCubes() {
    //green cubes
    createCube(0x00FF00, initialPosition.x + greenInitialPositions[0][0] * step, initialPosition.y - greenInitialPositions[0][1] * step, 1, 'cubegreen1', greenInitialPositions[0][0], greenInitialPositions[0][1]);
    createCube(0x00FF00, initialPosition.x + greenInitialPositions[1][0] * step, initialPosition.y - greenInitialPositions[1][1] * step, 1, 'cubegreen2', greenInitialPositions[1][0], greenInitialPositions[1][1]);
    createCube(0x00FF00, initialPosition.x + greenInitialPositions[2][0] * step, initialPosition.y - greenInitialPositions[2][1] * step, 1, 'cubegreen3', greenInitialPositions[2][0], greenInitialPositions[2][1]);
    createCube(0x00FF00, initialPosition.x + greenInitialPositions[3][0] * step, initialPosition.y - greenInitialPositions[3][1] * step, 1, 'cubegreen4', greenInitialPositions[3][0], greenInitialPositions[3][1]);

    //red cubes
    createCube(0xFF0000, initialPosition.x + redInitialPositions[0][0] * step, initialPosition.y - redInitialPositions[0][1] * step, 1, 'cubered1', redInitialPositions[0][0], redInitialPositions[0][1]);
    createCube(0xFF0000, initialPosition.x + redInitialPositions[1][0] * step, initialPosition.y - redInitialPositions[1][1] * step, 1, 'cubered2', redInitialPositions[1][0], redInitialPositions[1][1]);
    createCube(0xFF0000, initialPosition.x + redInitialPositions[2][0] * step, initialPosition.y - redInitialPositions[2][1] * step, 1, 'cubered3', redInitialPositions[2][0], redInitialPositions[2][1]);
    createCube(0xFF0000, initialPosition.x + redInitialPositions[3][0] * step, initialPosition.y - redInitialPositions[3][1] * step, 1, 'cubered4', redInitialPositions[3][0], redInitialPositions[3][1]);

    //yellow cubes
    createCube(0xFFFF00, initialPosition.x + yellowInitialPositions[0][0] * step, initialPosition.y - yellowInitialPositions[0][1] * step, 1, 'cubeyellow1', yellowInitialPositions[0][0], yellowInitialPositions[0][1]);
    createCube(0xFFFF00, initialPosition.x + yellowInitialPositions[1][0] * step, initialPosition.y - yellowInitialPositions[1][1] * step, 1, 'cubeyellow2', yellowInitialPositions[1][0], yellowInitialPositions[1][1]);
    createCube(0xFFFF00, initialPosition.x + yellowInitialPositions[2][0] * step, initialPosition.y - yellowInitialPositions[2][1] * step, 1, 'cubeyellow3', yellowInitialPositions[2][0], yellowInitialPositions[2][1]);
    createCube(0xFFFF00, initialPosition.x + yellowInitialPositions[3][0] * step, initialPosition.y - yellowInitialPositions[3][1] * step, 1, 'cubeyellow4', yellowInitialPositions[3][0], yellowInitialPositions[3][1]);

    //blue cubes
    createCube(0x0000FF, initialPosition.x + blueInitialPositions[0][0] * step, initialPosition.y - blueInitialPositions[0][1] * step, 1, 'cubeblue1', blueInitialPositions[0][0], blueInitialPositions[0][1]);
    createCube(0x0000FF, initialPosition.x + blueInitialPositions[1][0] * step, initialPosition.y - blueInitialPositions[1][1] * step, 1, 'cubeblue2', blueInitialPositions[1][0], blueInitialPositions[1][1]);
    createCube(0x0000FF, initialPosition.x + blueInitialPositions[2][0] * step, initialPosition.y - blueInitialPositions[2][1] * step, 1, 'cubeblue3', blueInitialPositions[2][0], blueInitialPositions[2][1]);
    createCube(0x0000FF, initialPosition.x + blueInitialPositions[3][0] * step, initialPosition.y - blueInitialPositions[3][1] * step, 1, 'cubeblue4', blueInitialPositions[3][0], blueInitialPositions[3][1]);
}

function takeStepDown(cube, start, end, time) {
    var widht = 10;
    var cubeGeometry = cube.geometry;
    var initialHeight;

    var mat = new THREE.Matrix4();

    if (!isTweening) {
        var tween = new TWEEN.Tween({
                x: start,
                cube: cube,
                previous: 0
            })
            .to({
                x: end
            }, time)
            .easing(TWEEN.Easing.Linear.None)
            .onStart(function () {
                isTweening = true;
                this.previous = this.x;
                initialHeight = cube.position.z;
            })
            .onUpdate(function () {
                cube.geometry.applyMatrix(mat.makeRotationX(Math.PI * (this.x - this.previous) / (end - start) / 2));


                var mul = 0;
                if (this.x > (end + start) / 2)
                    mul = 1;
                else mul = -1;

                cube.geometry.verticesNeedUpdate = true;
                cube.geometry.normalsNeedUpdate = true;

                cube.previous = this.x;
                this.previous = this.x;

                cube.position.y = this.x;
            })
            .onComplete(function () {
                cube.position.x = Math.round(cube.position.x);
                cube.position.y = Math.round(cube.position.y);
                cube.position.z = Math.round(cube.position.z);
                diceResult--;
                isTweening = false;

                var position = getCubePosition(selected);

                selected.currentX = position[0];
                selected.currentY = position[1];

                var result = $.grep(collidableMeshList, function (e) {
                    return e.name == selected.name;
                });

                if (result.length > 0) {
                    result[0].currentX = position[0];
                    result[0].currentY = position[1];
                }

                //if red reaches end
                if (position[0] == 8 && position[1] == 7) {
                    cheer.play();

                    var index = enemyCubes.indexOf(selected);

                    if (index > -1) {
                        enemyCubes.splice(index, 1);
                    }

                    scene.remove(selected);
                    reds--;

                    changePlay();
                }

                //check if player won or lost
                if (reds == 0 && $("#playerTeam").text() === "red") {
                    $('#myWinModal').modal({
                        backdrop: 'static',
                        keyboard: true
                    }).show();
                    //stop game loop
                    diceResult = 0;
                } else if (reds == 0 && $("#enemyTeam").text() === "red") {
                    $('#myLoseModal').modal({
                        backdrop: 'static',
                        keyboard: true
                    }).show();
                    //stop game loop
                    diceResult = 0;
                }
            })
            .start();
    }
}

function takeStepUp(cube, start, end, time) {
    var widht = 10;
    var cubeGeometry = cube.geometry;
    var initialHeight;

    var mat = new THREE.Matrix4();

    if (!isTweening) {
        var tween = new TWEEN.Tween({
                x: start,
                cube: cube,
                previous: 0
            })
            .to({
                x: end
            }, time)
            .easing(TWEEN.Easing.Linear.None)
            .onStart(function () {

                isTweening = true;
                this.previous = this.x;
                initialHeight = cube.position.z;
            })
            .onUpdate(function () {
                cube.geometry.applyMatrix(mat.makeRotationX(Math.PI * (this.previous - this.x) / (end - start) / 2));


                var mul = 0;
                if (this.x > (end + start) / 2)
                    mul = 1;
                else mul = -1;

                cube.geometry.verticesNeedUpdate = true;
                cube.geometry.normalsNeedUpdate = true;

                cube.previous = this.x;
                this.previous = this.x;

                cube.position.y = this.x;
            })
            .onComplete(function () {

                cube.position.x = Math.round(cube.position.x);
                cube.position.y = Math.round(cube.position.y);
                cube.position.z = Math.round(cube.position.z);
                diceResult--;
                isTweening = false;

                var position = getCubePosition(selected);

                selected.currentX = position[0];
                selected.currentY = position[1];

                var result = $.grep(collidableMeshList, function (e) {
                    return e.name == selected.name;
                });

                if (result.length > 0) {
                    result[0].currentX = position[0];
                    result[0].currentY = position[1];
                }


                //if yellow reach end
                if (position[0] == 8 && position[1] == 9) {
                    cheer.play();

                    var index = enemyCubes.indexOf(selected);

                    if (index > -1) {
                        enemyCubes.splice(index, 1);
                    }

                    scene.remove(selected);
                    yellows--;

                    changePlay();
                }

                //check if player won or lost
                if (yellows == 0 && $("#playerTeam").text() === "yellow") {
                    $('#myWinModal').modal({
                        backdrop: 'static',
                        keyboard: true
                    }).show();
                    //stop game loop
                    diceResult = 0;
                } else if (yellows == 0 && $("#enemyTeam").text() === "yellow") {
                    $('#myLoseModal').modal({
                        backdrop: 'static',
                        keyboard: true
                    }).show();
                    //stop game loop
                    diceResult = 0;
                }


            })
            .start();
    }
}

function takeStepRight(cube, start, end, time) {
    var widht = 10;
    var cubeGeometry = cube.geometry;
    var initialHeight;

    var mat = new THREE.Matrix4();

    if (!isTweening) {
        var tween = new TWEEN.Tween({
                x: start,
                cube: cube,
                previous: 0
            })
            .to({
                x: end
            }, time)
            .easing(TWEEN.Easing.Linear.None)
            .onStart(function () {

                isTweening = true;
                this.previous = this.x;
                initialHeight = cube.position.z;
            })
            .onUpdate(function () {
                cube.geometry.applyMatrix(mat.makeRotationY(Math.PI * (this.x - this.previous) / (end - start) / 2));


                var mul = 0;
                if (this.x > (end + start) / 2)
                    mul = 1;
                else mul = -1;

                cube.geometry.verticesNeedUpdate = true;
                cube.geometry.normalsNeedUpdate = true;

                cube.previous = this.x;
                this.previous = this.x;
                cube.position.x = this.x;
            })
            .onComplete(function () {

                cube.position.x = Math.round(cube.position.x);
                cube.position.y = Math.round(cube.position.y);
                cube.position.z = Math.round(cube.position.z);
                diceResult--;
                isTweening = false;


                var position = getCubePosition(selected);

                selected.currentX = position[0];
                selected.currentY = position[1];

                var result = $.grep(collidableMeshList, function (e) {
                    return e.name == selected.name;
                });

                if (result.length > 0) {
                    result[0].currentX = position[0];
                    result[0].currentY = position[1];
                }


                //if green reach end
                if (position[0] == 7 && position[1] == 8) {
                    cheer.play();

                    var index = enemyCubes.indexOf(selected);

                    if (index > -1) {
                        enemyCubes.splice(index, 1);
                    }

                    scene.remove(selected);
                    greens--;

                    changePlay();
                }
                //check if player won or lost
                if (greens == 0 && $("#playerTeam").text() === "green") {
                    $('#myWinModal').modal({
                        backdrop: 'static',
                        keyboard: true
                    }).show();
                    //stop game loop
                    diceResult = 0;
                } else if (greens == 0 && $("#enemyTeam").text() === "green") {
                    $('#myLoseModal').modal({
                        backdrop: 'static',
                        keyboard: true
                    }).show();
                    //stop game loop
                    diceResult = 0;
                }

            })
            .start();
    }
}

function takeStepLeft(cube, start, end, time) {
    var widht = 10;
    var cubeGeometry = cube.geometry;
    var initialHeight;

    var mat = new THREE.Matrix4();

    if (!isTweening) {
        var tween = new TWEEN.Tween({
                x: start,
                cube: cube,
                previous: 0
            })
            .to({
                x: end
            }, time)
            .easing(TWEEN.Easing.Linear.None)
            .onStart(function () {

                isTweening = true;
                this.previous = this.x;
                initialHeight = cube.position.z;
            })
            .onUpdate(function () {
                cube.geometry.applyMatrix(mat.makeRotationY(Math.PI * (this.previous - this.x) / (end - start) / 2));


                var mul = 0;
                if (this.x > (end + start) / 2)
                    mul = 1;
                else mul = -1;

                cube.geometry.verticesNeedUpdate = true;
                cube.geometry.normalsNeedUpdate = true;

                cube.previous = this.x;
                this.previous = this.x;

                cube.position.x = this.x;
            })
            .onComplete(function () {

                cube.position.x = Math.round(cube.position.x);
                cube.position.y = Math.round(cube.position.y);
                cube.position.z = Math.round(cube.position.z);
                diceResult--;
                isTweening = false;

                var position = getCubePosition(selected);

                selected.currentX = position[0];
                selected.currentY = position[1];

                var result = $.grep(collidableMeshList, function (e) {
                    return e.name == selected.name;
                });

                if (result.length > 0) {
                    result[0].currentX = position[0];
                    result[0].currentY = position[1];
                }


                //if blues reach end
                if (position[0] == 9 && position[1] == 8) {
                    cheer.play();
                    //if enemy arrived remove it from the list
                    var index = enemyCubes.indexOf(selected);

                    if (index > -1) {
                        enemyCubes.splice(index, 1);
                    }

                    scene.remove(selected);
                    blues--;

                    changePlay();
                }
                //check if player won or lost
                if (blues == 0 && $("#playerTeam").text() === "blue") {
                    $('#myWinModal').modal({
                        backdrop: 'static',
                        keyboard: true
                    }).show();
                    //stop game loop
                    diceResult = 0;
                } else if (blues == 0 && $("#enemyTeam").text() === "blue") {
                    $('#myLoseModal').modal({
                        backdrop: 'static',
                        keyboard: true
                    }).show();

                    //stop game loop
                    diceResult = 0;
                }
            })
            .start();
    }
}

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// calls the init function when the window is done loading.
window.onload = init;
// calls the handleResize function when the window is resized
window.addEventListener('resize', handleResize, false);