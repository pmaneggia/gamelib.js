class World {

    constructor(domelement, width, height, background = null, useGrid = false, showGrid = false, gridSize = 0) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = "world";
        this.canvas.width = width;
        this.canvas.height = height;

        this.ctx = this.canvas.getContext("2d");

        this.background = background;
        this.useGrid = useGrid;
        this.showGrid = showGrid;
        this.gridSize = gridSize;
        this._entity = [];
        this.intervalID = undefined;
        this._keyDown = [];
        this._keyUp = [];

        //get into dom
        var domentry = document.getElementsByTagName(domelement)[0];
        domentry.appendChild(this.canvas);

        //for loading images with correct path
        this.basePath = location.href.substring(0, location.href.lastIndexOf("/") + 1);

        //get all keyboard inputs
        var self = this;
        document.body.addEventListener("keydown", function (event) {
            if (event.defaultPrevented) {
                return; // Do nothing if the event was already processed
            }

            if (!self._keyDown.includes(event.key)) self._keyDown.push(event.key);

            // Cancel the default action to avoid it being handled twice
            event.preventDefault();
        }, true);

        document.body.addEventListener("keyup", function (event) {
            if (event.defaultPrevented) {
                return; // Do nothing if the event was already processed
            }

            if (!self._keyUp.includes(event.key)) self._keyUp.push(event.key);
            // Cancel the default action to avoid it being handled twice
            event.preventDefault();
        }, true);
    }

    async play() {
        var self = this;
        function update() {
            self.update();
        }

        if (this.intervalID) stop();
        await this.preload();
        this.intervalID = window.setInterval(update, 16);
    }

    stop() {
        clearInterval(this.intervalID);
    }

    get gridHeight() {
        return Math.floor(this.height() / this.gridSize);
    }

    get gridWidth() {
        return Math.floor(this.width() / this.gridSize);
    }

    getEntity(name) {
        return this._entity[name];
    }

    removeEntity(e) {
        for (let i = 0; i < this._entity.length; ++i) {
            if (this._entity[i] == e) this._entity.splice(i, 1);
        }
    }

    checkCollision(a, x, y) {
        var result = false;
        for (let b of this._entity) {
            if (a != b) {
                if (!(x >= b.x + b.width || y >= b.y + b.height ||
                    x + a.width <= b.x || y + a.height <= b.y)) {
                    //console.log(a.collidate(b) || b.collidate(a));
                    result = result || (a.collidate(b) || b.collidate(a));
                }
            }
        }
        return result;
    }

    removeAllEntities() {
        this._entity = [];
    }

    addEntity(entity) {
        entity.world = this;
        this._entity.push(entity);
    }

    async preload() {
        var n = 0;
        var loaded = 0;
        var self = this;
        //count assets
        for (let e of this._entity) {
            if (e.img.hasOwnProperty("url")) n++;
        }
        if (this.background.hasOwnProperty("url")) n++;

        var loadImage = function (src) {
            var img = new Image();
            img.onload = complete;
            console.log("img.src = " + self.basePath + src);
            img.src = self.basePath + src;
            return img;
        }

        var complete = function () {
            loaded += 1;
            if (loaded === n) {
                console.log("prealoding compleated");
                return true;
            }
        }

        //preload all needed assets
        console.log('starting preload');
        for (let e of this._entity) {
            if (e.img.hasOwnProperty("url")) {
                e.img.img = loadImage(e.img.url);
            }
        }
        if (this.background.hasOwnProperty("url")) this.background.img = loadImage(this.background.url);
    }

    update() {
        //key events
        for (let entry of this._keyDown) {
            //call listener for hold
            for (let e of this._entity) {
                e.keyHold(entry);
            }
        }

        for (var i = 0; i < this._keyUp.length; i++) {
            //call listener for click
            for (let e of this._entity) {
                e.keyPressed(this._keyUp[i]);
            }

            if (this._keyDown.indexOf(this._keyUp[i]) != -1) {
                this._keyDown.splice(this._keyDown.indexOf(this._keyUp[i]), 1);
            }
            this._keyUp.splice(i, 1);
        }

        //update all
        for (let e of this._entity) {
            e.update();
        }

        //show result
        this.draw();
    }

    draw() {
        //draw background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.background) {
            this.background.draw(this.ctx, 0, 0);
        } else {
            this.ctx.fillStyle = "white";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        //draw entities
        for (let e of this._entity) {
            e.draw(this.ctx);
        }

        return this.canvas;

    }

}

class Entity {
    constructor(x, y, width, height, type = "entity") {
        this.x = x;
        this.y = y;
        this.height = height;
        this.width = width;
        this.type = type;
    }

    draw() {
        throw Error;
    }

    move(x, y) {
        if (!this.world.checkCollision(this, this.x + x, this.y + y)) {
            this.x = this.x + x;
            this.y = this.y + y;
            return true;
        } else {
            return false;
        }
    }

    async step(x, y) {
        if (this.world.checkCollision(this, this.x + x * this.world.gridSize, this.y + y * this.world.gridSize)) {
            for (i = 0; i < x * this.world.gridSize; i++) {
                move(1, 0);
                sleep(1000 / 16);
            }
            for (i = 0; i < y * this.world.gridSize; i++) {
                move(0, 1);
                sleep(1000 / 16);
            }

            return true;
        } else {
            return false;
        }
    }

    collidate(obj) {
        return true;
    }

    update() {
        return true;
    }

    keyHold(key) {
        return true;
    }

    keyPressed(key) {
        return true;
    }
}


class StaticNothing {
    constructor(width, height) {
        this.height = height;
        this.width = width;
    }

    draw(ctx, x, y) {
        return { x: this.width, y: this.height }
    }
}

class StaticBackground {
    constructor(color, width, height) {
        this.color = color;
        this.height = height;
        this.width = width;
    }

    draw(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.width, this.height);
        return { x: this.width, y: this.height }
    }
}

class StaticText {
    constructor(text = "") {
        //good fonts: Knewave, Coda Caption, Gaegu
        this.fontSize = 30;
        this.fontFamily = "Knewave";
        this.fillStyle = "black";
        this.textAlign = "left"; //left, center, right
        this.text = text;
    }

    draw(ctx, x, y) {
        ctx.font = this.fontSize + "px " + this.fontFamily;
        ctx.fillStyle = this.fillStyle;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = "top"; //so the position is like other boxes
        ctx.fillText(this.text, x, y);

        return { x: ctx.measureText(this.text).width, y: this.fontSize }
    }
}

class StaticImg {
    constructor(url, width, height) {
        this.url = url;
        this.img = null;
        this.height = height;
        this.width = width;
    }

    draw(ctx, x, y) {
        ctx.drawImage(this.img, x, y);
        return { x: this.width, y: this.height }
    }
}

class Sprite {
    constructor(url, width, height) {
        this.url = url;
        this.img = null;
        this.height = height;
        this.width = width;

        this.costumes = {};
        this.n = 0; //count costume
        this.i = 0; //count pauses
    }

    set costume(costume) {
        if (this._costume != costume) {
            this._costume = costume;
            this.n = 0;
        }
    }

    get costume() {
        return this._costume
    }

    draw(ctx, x, y) {
        let n, yImg, xImg;
        n = this.costumes[this._costume][this.n];
        yImg = Math.floor(n / (this.img.width / this.width));
        xImg = n - (yImg * (this.img.width / this.width))

        ctx.drawImage(this.img, xImg * this.width, yImg * this.height, this.width, this.height, x, y, this.width, this.height);

        if (this.i > 1000 / 16 / this.costumes[this._costume].length) {
            if (this.costumes[this._costume].length - 1 == this.n) {
                this.n = 0;
            } else {
                this.n = this.n + 1;
            }
            this.i = 0;
        } else {
            this.i = this.i + 1;
        }

        return { x: this.width, y: this.height }
    }
}

class Figure extends Entity {

    constructor(x, y, width, height, img, type = "figure") {
        super(x, y, width, height, type);

        this.img = img;
    }

    draw() {
        var size = this.img.draw(this.world.ctx, this.x, this.y);
        super.width = size.x;
        super.height = size.y;
    }
}

const sleep = ms => new Promise(res => setTimeout(res, ms));