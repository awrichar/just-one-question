var forms = require('forms');
var fields = forms.fields;
var widgets = forms.widgets;

module.exports = function() {
  return forms.create({
    email: fields.string({
      required: true,
      errorAfterField: true,
      widget: widgets.text({
        placeholder: 'Your email',
        classes: ['input-lg'],
      }),
    }),

    recipients: fields.string({
      required: true,
      errorAfterField: true,
      widget: widgets.text({
        placeholder: 'Your recipients',
        classes: ['input-lg'],
      }),
    }),

    question: fields.string({
      required: true,
      errorAfterField: true,
      widget: widgets.text({
        placeholder: 'Your question',
        classes: ['input-lg'],
      }),
    }),

    choices: fields.string({
      required: true,
      errorAfterField: true,
      widget: widgets.textarea({
        placeholder: 'Your answer choices (one per line)',
        rows: 6,
        classes: ['input-lg'],
      }),
    }),
  }, { validatePastFirstError: true });
};