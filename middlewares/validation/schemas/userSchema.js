import { Yup } from "../yupExtensions.js";

const createUserSchema = Yup.object().shape({
    fullname: Yup.string()
    .requiredField('Full name'),
    
    email: Yup.string()
    .emailField('Email'),
    
    password: Yup.string()
    .requiredField('Password')
    .minLength(6, 'Password'),
    
    role: Yup.string()
    .enumField(['user', 'seller', 'admin'], 'Role')
});



export { createUserSchema }