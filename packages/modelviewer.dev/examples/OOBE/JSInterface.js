import copyData from './title_body_data.json' assert {type: 'json'};

const COPY = copyData.copy;
let prevTextId = 0;
let currTextId = 0;

const vignette = document.querySelector('#vignette');
const card = document.querySelector('#card');
const cardImg = document.querySelector('#card-image');
const cardTitle = document.querySelector('#card-title');
const cardBody = document.querySelector('#card-body');
const dots = document.querySelector('#dots');
const skipButton = document.querySelector('#skip');
const nextButton = document.querySelector('#next');
const backButton = document.querySelector('#back');

// Display the correct UI for the given state
function setStateParameters(state, calloutData) {
    console.log("Displaying UI for: " + state.name);

    updateTextCard(state.titleStringID, state.bodyStringID);
    updateButtons(state);
    updateDots(state.showDots, calloutData);
}

// Update text and image in the card
function updateTextCard(titleStringID, bodyStringID) {
    prevTextId = currTextId;
    currTextId = titleStringID;

    if (currTextId != prevTextId) {
        animateCard();
    }
    
    let data = findDataById(titleStringID, COPY);
    if (data) {
        // Update the image if available
        if ('imageSrc'in data) {
            cardImg.style.display = "block";
            cardImg.src = data.imageSrc;
        } else {
            cardImg.style.display = "none";
            cardImg.src = "";
        }
        cardTitle.innerHTML = data.titleString;
        cardBody.innerHTML = data.bodyString;
    }
    else {
        cardTitle.innerHTML = titleStringID;
        cardBody.innerHTML = bodyStringID;
    }
}

function animateCard() {
    // Remove the animation class
    card.classList.remove("run-slide-in-animation");
    // Trigger reflow
    void card.offsetWidth;
    // Re-add the animation class
    card.classList.add("run-slide-in-animation");
}

function findDataById(targetId, dataArr) {
    for (let i = 0; i < dataArr.length; i++) {
        if (targetId == dataArr[i].id) {
            return dataArr[i];
        }
    }
}

function updateButtons(state) {
    if (state.showNextButtonDelay > 0) {
        toggleButton('next', false, state.nextButtonTextOverride);
        setTimeout(function() {
          toggleButton('next', state.showNextButton, state.nextButtonTextOverride);
        }.bind(this), state.showNextButtonDelay);
      } else {
        toggleButton('next', state.showNextButton, state.nextButtonTextOverride);
      }
  
      if (state.showSkipButtonDelay > 0) {
        toggleButton('skip', false, state.skipButtonTextOverride);
        setTimeout(function() {
          toggleButton('skip', state.showSkipButton, state.skipButtonTextOverride);
        }.bind(this), state.showSkipButtonDelay);
      } else {
        toggleButton('skip', state.showSkipButton, state.skipButtonTextOverride);
      }
}

// Show or hide certain buttons depending on which state we're in
function toggleButton(buttonName, buttonState, buttonTextOverride) {
    if (buttonName == "next") {
        if (!buttonState) {
            nextButton.style.visibility = 'hidden';
        }
        else {
            if (buttonTextOverride) { nextButton.innerHTML = buttonTextOverride; }
            nextButton.style.visibility = 'visible';
        }
    }

    if (buttonName == "skip") {
        if (!buttonState) {
            skipButton.style.visibility = 'hidden';
            backButton.style.visibility = 'visible';
        }
        else {
            if (buttonTextOverride) { skipButton.innerHTML = buttonTextOverride; }
            skipButton.style.visibility = 'visible';
            backButton.style.visibility = 'hidden';
        }
    }
}

// TODO: Show dots on the UI
function updateDots(show, callouts) {
    if (show) {
        dots.style.visibility = 'visible';
        let numDots = findNumDots(callouts);
        let dot;
        for (let i = 0; i < numDots; i++) {
            dot = document.createElement('div');
            dot.className = 'dot';
            dots.append(dot)
        }
        // Change to curr page dot
        dots.firstElementChild.classList.add('active-dot');
    }
    else {
        dots.style.visibility = 'hidden';
        while (dots.hasChildNodes()) {
            dots.removeChild(dots.firstChild);
        }
    }
}

function findNumDots(callouts) {
    let index = 0;
    for (const callout in callouts) {
        let dotIdx = callouts[callout].pageDot;
        if (dotIdx > index) {
            index = dotIdx;
        }
    }
    return index;
}

export { setStateParameters };