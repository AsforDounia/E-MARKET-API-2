import { Yup } from "../yupExtensions.js";

const createProductSchema = Yup.object().shape({
  title: Yup.string()
    .requiredField('Title'),
  
  description: Yup.string()
    .requiredField('Description'),
  
  price: Yup.number()
    .requiredField('Price')
    .minValue(0, 'Price')
    .errorType('Price'),
  
  stock: Yup.number()
    .requiredField('Stock')
    .minValue(0, 'Stock')
    .errorType('Stock'),
  
  imageUrls: Yup.array()
    .of(Yup.string().urlField('imageUrl'))
    .optional()
});

const updateProductSchema = Yup.object().shape({
  title: Yup.string()
  .trimField('Title')
  .optional(),

  description: Yup.string()
  .trimField('Description')
  .optional(),

  price: Yup.number()
  .minValue(0, 'Price')
  .errorType('Price')
  .optional(),

  stock: Yup.number()
  .minValue(0, 'Stock')
  .errorType('Stock')
  .optional(),

  imageUrls: Yup.array()
  .of(Yup.string().urlField('imageUrl'))
  .optional(),

  categoryIds: Yup.array().of(Yup.string()).optional(),
});


export { createProductSchema , updateProductSchema}