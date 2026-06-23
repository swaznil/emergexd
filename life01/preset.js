function presetChaos(){

    particles = [];
    groups = {};
    rules = [];

    groups.red = create(300,"red");
    groups.blue = create(300,"blue");
    groups.green = create(300,"lime");

    setRule("red","red",-0.5);
    setRule("red","blue",0.7);
    setRule("red","green",-0.3);

    setRule("blue","red",-0.6);
    setRule("blue","blue",0.2);
    setRule("blue","green",0.8);

    setRule("green","red",0.5);
    setRule("green","blue",-0.7);
    setRule("green","green",-0.2);

    updateRuleEditor();
}

function presetNotChaos(){

    particles = [];
    groups = {};
    rules = [];

    groups.red = create(500,"red");
    groups.green = create(500,"lime");
    groups.blue = create(500,"cyan");

    setRule("red","red",-0.1);
    setRule("green","green",-0.1);
    setRule("blue","blue",-0.1);

    setRule("red","green",0.3);
    setRule("green","blue",0.3);
    setRule("blue","red",0.3);

    updateRuleEditor();
}

function presetOrbit() {

    particles = [];
    groups = {};
    rules = [];

    groups.red = create(250, "red");
    groups.blue = create(250, "cyan");
    groups.green = create(250, "lime");

    setRule("red", "red", -0.4);
    setRule("blue", "blue", -0.4);
    setRule("green", "green", -0.4);

    setRule("red", "blue", 0.5);
    setRule("blue", "green", 0.5);
    setRule("green", "red", 0.5);

    setRule("blue", "red", -0.2);
    setRule("green", "blue", -0.2);
    setRule("red", "green", -0.2);

    updateRuleEditor();
}