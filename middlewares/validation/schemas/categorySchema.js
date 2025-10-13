import { Yup } from "../yupExtensions.js";

const createCategorySchema = Yup.object().shape({
    name: Yup.string()
    .requiredField('Name'),

    description: Yup.string()
    .requiredField('Description'),
});

const updateCategorySchema = Yup.object().shape({
    name: Yup.string().trimField("Name"),
    description: Yup.string().trimField("Description"),
});

export { createCategorySchema, updateCategorySchema }