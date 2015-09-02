module.exports = {
  questions: [
    ['What is your phone of choice?', 'iPhone\nAndroid\nWindows\nFlip phone'],
    ['How is your week going?', 'Not great\nAlright\nGood\nExcellent'],
    ['How much TV do you watch daily?', '1 hour or less\n2 hours\n3 hours\n4 hours or more'],
    ['What is your favorite sport?', 'Football\nBaseball\nSoccer\nBasketball\nOther'],
    ['Who is the greatest Beatle?', 'John\nPaul\nGeorge\nRingo'],
    ['Who is the best Doctor?', 'Eccleston\nTennant\nSmith\nCapaldi'],
  ],

  getRandomQuestion: function() {
    var i = Math.floor(Math.random() * this.questions.length);
    return this.questions[i];
  },

  splitChoices: function(choices) {
    var output = [];
    if (!choices) return output;
    choices = choices.split('\n');

    for (var i=0; i<choices.length; i++) {
      var choice = choices[i].trim();
      if (choice) output.push(choice);
    }

    return output;
  },
};