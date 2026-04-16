// scenarios.js
// 5 preset conversation scenarios for screen recording demos

var Scenarios = {
  ideal: {
    label: '1. Ideal Lead',
    hint: 'The user is warm and receptive. They are interested in investment. They are comfortable with Nandi Hills location, have a budget around 1.5 crore, and are fine with the 2029 timeline. Move through all 4 checkpoints smoothly and close with CTA.',
    firstUserMessage: 'Hello?',
  },

  irritated: {
    label: '2. Irritated User',
    hint: 'The user is irritated and busy. They say something like "stop calling me" or "how did you get my number" right after the intro. Handle with empathy and exit immediately without pushing further.',
    firstUserMessage: 'Hello? Who is this?',
  },

  'location-mismatch': {
    label: '3. Location Mismatch',
    hint: 'The user has a good budget (around 1 crore) and is interested in investment, but they are not comfortable with Nandi Hills or North Bengaluru — they want a property in South Bengaluru or Whitefield only. Disqualify gracefully at the geography checkpoint.',
    firstUserMessage: 'Yes, hello?',
  },

  nri: {
    label: '4. NRI Investor',
    hint: 'The user is an NRI based in Dubai. They are interested in investing back in India. Emphasize the 15-20 minute distance to Kempegowda International Airport, NRI plot purchase ease, and Devanahalli corridor appreciation. All checkpoints should pass. Close with CTA.',
    firstUserMessage: 'Hi, yes. I am calling from Dubai, I got your message.',
  },

  disengaged: {
    label: '5. Disengaged Lead',
    hint: 'The user is lukewarm and distracted. They express concern about the 2029 possession timeline saying it is too far away. Use the investment reframe (lower entry price, built-in appreciation). The user gradually warms up and agrees to the CTA by the end.',
    firstUserMessage: 'Yeah, hi. What is this about?',
  },

  get: function(key) {
    var scenario = this[key];
    if (scenario && typeof scenario === 'object' && scenario.hint) return scenario;
    return null;
  }
};
