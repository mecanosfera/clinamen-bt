var clinamen;
(function (clinamen) {
    class Decorator extends clinamen.Composite {
        constructor(data) {
            super(data);
            this.mainType = 'decorator';
            this.type = 'decorator';
            this.result = data.result || null;
            this.filter = data.filter || null;
            this.target = data.target || null;
            //this.child = null;
            //this.setChildren(data);
        }
        setChildren(data) {
            if (data.child != null) {
                this.add(data.child);
            }
            else {
                this.child = null;
            }
            return this;
        }
        setAgent(agent) {
            if (agent != null) {
                this.agent = agent;
                if (this.child != null) {
                    this.child.setAgent(agent);
                }
            }
            return this;
        }
        add(node) {
            var child = node;
            if (!(node instanceof clinamen.Node)) {
                child = this.nodeConstructor(node);
            }
            this.child = child;
            child.setAgent(this.agent);
            return this;
        }
        fail(stack) {
            stack.pop();
            stack.last().node.fail(stack);
            return this;
        }
        success(stack) {
            stack.pop();
            stack.last().node.success(stack);
            return this;
        }
        next(stack) {
            if (this.testCondition()) {
                stack.push(this.child);
            }
            else {
                this.fail(stack);
            }
            return this;
        }
        testCondition() {
            return false;
        }
        run() {
            if (!this.child) {
                return false;
            }
            if (this.testCondition()) {
                return this.child.run();
            }
            return false;
        }
        json() {
            var js = super.json();
            js.child = this.child.json();
            js.filter = this.filter;
            js.result = this.result;
            return js;
        }
    }
    clinamen.Decorator = Decorator;
    class Jump extends Decorator {
        constructor(data) {
            super(data);
            this.type = "jump";
            this.childName = data.childName;
        }
        add(node) {
            if (node.type) {
                if (!node.name || !this.agent.childrenIndex[node.name]) {
                    return this;
                }
                this.childName = node.name;
                return this;
            }
            if (!node.childName || !this.agent.childrenIndex[node.childName]) {
                return this;
            }
            this.childName = node.childName;
            return this;
        }
        find(nodeName) {
            if (this.agent.childrenIndex[nodeName]) {
                this.child = this.agent.childrenIndex[nodeName];
                return true;
            }
            return false;
        }
        run() {
            if (!this.child || !this.find(this.childName)) {
                return false;
            }
            return this.child.run();
        }
    }
    clinamen.Jump = Jump;
    class Inverter extends Decorator {
        constructor(data) {
            super(data);
            this.type = "inverter";
        }
        success(stack) {
            stack.pop();
            stack.last().node.fail(stack);
            return this;
        }
        fail(stack) {
            stack.pop();
            stack.last().node.success(stack);
            return this;
        }
        next(stack) {
            stack.push(this.child);
            return this;
        }
        run() {
            if (this.child == null) {
                return false;
            }
            return !this.child.run();
        }
    }
    clinamen.Inverter = Inverter;
    class Limit extends Decorator {
        constructor(data) {
            super(data);
            this.runs = 0;
            this.type = 'limit';
            this.max = data.max || 0;
        }
        testCondition() {
            if (this.runs >= this.max) {
                return false;
            }
            this.runs++;
            return true;
        }
        json() {
            var js = super.json();
            js.max = this.max;
            js.runs = this.runs;
            return js;
        }
    }
    clinamen.Limit = Limit;
    class Find extends Decorator {
        constructor(data) {
            super(data);
            this.type = "find";
            this.filter = data.filter || {};
            this.scope = data.scope || 'world';
        }
        testCondition() {
            if (this.agent.temp && this.result != null) {
                this.agent.prop[this.result] = null;
            }
            var res = null;
            if (this.scope == 'world') {
                res = this.agent.world.find(this.filter);
            }
            else {
                res = this.agent.find(this.filter);
            }
            if (this.result != null) {
                this.agent.prop[this.result] = res;
            }
            if (res != null && this.child != null) {
                return true;
            }
        }
        json() {
            var js = super.json();
            js.scope = this.scope;
            return js;
        }
    }
    clinamen.Find = Find;
    class Condition extends Decorator {
        //{res/prop:?, op:'==', val/res/prop:?}
        constructor(data) {
            super(data);
            this.type = 'condition';
        }
        testCondition() {
            var target = this.target || this.agent;
            if (this.filterEval(this.target, this.filter)) {
                if (!this.child) {
                    return false;
                }
                return this.child.run();
            }
            return false;
        }
    }
    clinamen.Condition = Condition;
    class Count extends Decorator {
        //{res/prop:?}
        constructor(data) {
            super(data);
            this.type = "count";
            this.resultProp = data.resultProp || null;
        }
        run() {
            var target = this.target || this.agent;
            this.result = this.searchChildren(target, this.filter).length;
            if (this.resultProp) {
                this.agent.prop[this.resultProp] = this.result;
            }
            else {
                if (!this.agent.prop[this.name]) {
                    this.agent.prop[this.name] = { 'result': null };
                }
                this.agent.prop[this.name].result = this.result;
            }
            if (!this.child) {
                return true;
            }
            return this.child.run();
        }
    }
    clinamen.Count = Count;
    class Succeeder extends Decorator {
        fail(stack) {
            return this.success(stack);
        }
        success(stack) {
            stack.pop();
            stack.last().node.success(stack);
            return this;
        }
        next(stack) {
            stack.push(this.child);
            return this;
        }
        run() {
            this.child.run();
            return true;
        }
    }
    clinamen.Succeeder = Succeeder;
    class Failer extends Decorator {
        fail(stack) {
            stack.pop();
            stack.last().node.fail(stack);
            return this;
        }
        success(stack) {
            return this.fail(stack);
        }
        next(stack) {
            stack.push(this.child);
            return this;
        }
        run() {
            this.child.run();
            return false;
        }
    }
    clinamen.Failer = Failer;
    class Repeater extends Decorator {
        constructor(data) {
            super(data);
            this.runs = 0;
            this.max = data.max;
        }
        fail(stack) {
            if (this.max && this.runs <= this.max) {
                this.runs = 0;
                stack.pop();
                stack.last().node.fail(stack);
            }
            return this;
        }
        success(stack) {
            if (this.max && this.runs <= this.max) {
                this.runs = 0;
                stack.pop();
                stack.last().node.success(stack);
            }
            return this;
        }
        next(stack) {
            if (!this.max) {
                stack.push(this.child);
            }
            else if (this.runs <= this.max) {
                stack.push(this.child);
                this.runs++;
            }
            return this;
        }
        run() {
            if (!this.child) {
                return false;
            }
            if (!this.max) {
                this.child.run();
            }
            else {
                this.runs++;
                while (this.runs < this.max) {
                    this.child.run();
                }
                this.runs = 0;
                return this.child.run();
            }
        }
    }
    clinamen.Repeater = Repeater;
    class RepeatUntilSucceeds extends Decorator {
        success(stack) {
            stack.pop();
            stack.last().node.success(stack);
            return this;
        }
        fail(stack) {
            return this;
        }
        next(stack) {
            stack.push(this.child);
            return this;
        }
        run() {
            if (this.child.run()) {
                return true;
            }
        }
    }
    clinamen.RepeatUntilSucceeds = RepeatUntilSucceeds;
    class RepeatUntilFail extends Decorator {
        fail(stack) {
            stack.pop();
            stack.last().node.fail(stack);
            return this;
        }
        success(stack) {
            return this;
        }
        next(stack) {
            stack.push(this.child);
            return this;
        }
        run() {
            if (!this.child.run()) {
                return false;
            }
        }
    }
    clinamen.RepeatUntilFail = RepeatUntilFail;
})(clinamen || (clinamen = {}));
