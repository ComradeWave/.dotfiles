"use strict";

// eslint-disable-next-line
var tempDiv = document.querySelector('#hTempDivClickSignal');
// eslint-disable-next-line no-undef
document.querySelector(tempDiv.textContent).click();
// eslint-disable-next-line no-undef
tempDiv.dispatchEvent(new CustomEvent('clickFinished'));