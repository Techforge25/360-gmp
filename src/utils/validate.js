const ApiError = require("./ApiError");

const validate = (schema, payload) => {
    const { error, value } = schema.validate(payload, {
        abortEarly: true,
        stripUnknown: true
    });

    if(error) throw new ApiError(400, error.details[0].message);
    return value;
};

module.exports = validate;