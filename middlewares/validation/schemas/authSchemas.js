import * as yup from 'yup';
import {Yup} from "../yupExtensions.js";

const registerSchema = yup.object({
    fullname: Yup.string()
        .requiredField('Full name'),

    email: Yup.string()
        .emailField('Email'),

    password: Yup.string()
        .requiredField('Password')
        .minLength(6, 'Password'),

    role: Yup.string()
        .enumField(['user', 'admin', 'seller'], 'Role')
});


const loginSchema = Yup.object().shape({
    email: Yup.string()
        .emailField('Email'),

    password: Yup.string()
        .requiredField('Password')
});


export { registerSchema, loginSchema}