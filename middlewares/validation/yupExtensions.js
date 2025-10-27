import * as Yup from 'yup';


// String validation methods
Yup.addMethod(Yup.string, 'requiredField', function(fieldName) {
  return this.required(`${fieldName} is required`).trim();
});

Yup.addMethod(Yup.string, 'minLength', function(length, fieldName) {
  return this.min(length, `${fieldName} must be at least ${length} characters long`);
});

Yup.addMethod(Yup.string, 'maxLength', function(length, fieldName) {
  return this.max(length, `${fieldName} must not exceed ${length} characters`);
});

Yup.addMethod(Yup.string, 'emailField', function(fieldName) {
  return this
    .required(`${fieldName} is required`)
    .trim()
    .email('Please fill a valid email address');
});

Yup.addMethod(Yup.string, 'enumField', function(values, fieldName) {
  const valuesList = values.join(', ');
  return this.oneOf(
    values,
    `${fieldName} must be one of: ${valuesList}`
  );
});


// Number validation methods
Yup.addMethod(Yup.number, 'requiredField', function(fieldName) {
  return this.required(`${fieldName} is required`);
});

Yup.addMethod(Yup.number, 'minValue', function(value, fieldName) {
  return this.min(value, `${fieldName} must be at least ${value}`);
});

Yup.addMethod(Yup.number, 'maxValue', function(value, fieldName) {
  return this.max(value, `${fieldName} must not exceed ${value}`);
});


Yup.addMethod(Yup.number, 'errorType', function (fieldName) {
    return this.typeError(`${fieldName} must be a valid number`);
});


Yup.addMethod(Yup.string, 'urlField' , function(fieldName){
    return this.url(`${fieldName} must be a valid URL`);
})


Yup.addMethod(Yup.string, 'trimField', function(fieldName) {
    return this.test(
    'no-only-spaces',
    `${fieldName} cannot be empty or contain only spaces`,
    value => value === undefined || value.trim().length > 0
  );
});


// Date validation methods
Yup.addMethod(Yup.date, 'requiredField', function(fieldName) {
  return this.required(`${fieldName} is required`);
});

export { Yup } ;