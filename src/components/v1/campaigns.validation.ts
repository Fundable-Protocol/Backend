import Joi from 'joi';

export const campaignSchema = Joi.object({
  campaign_ref: Joi.string()
    .length(5)
    .trim()
    .regex(/^[^\s]+$/)
    .required()
    .messages({
      'string.base': 'campaign_ref must be a string',
      'string.length': 'campaign_ref must be exactly 5 characters',
      'string.empty': 'campaign_ref cannot be empty',
      'string.pattern.base': 'campaign_ref cannot contain whitespace',
      'any.required': 'campaign_ref is required',
    }),
  target_amount: Joi.string()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      if (BigInt(value) <= 0n) {
        return helpers.error('any.invalid');
      }
      // Optionally, check if value fits u256
      if (BigInt(value) > (2n ** 256n - 1n)) {
        return helpers.error('any.invalid');
      }
      return value;
    }, 'u256 validation')
    .required()
    .messages({
      'string.base': 'target_amount must be a string',
      'string.pattern.base': 'target_amount must be a positive integer',
      'any.invalid': 'target_amount must be a positive number and valid u256',
      'any.required': 'target_amount is required',
    }),
  donation_token: Joi.string()
    .pattern(/^0x[0-9a-fA-F]{64}$/)
    .required()
    .messages({
      'string.base': 'donation_token must be a string',
      'string.pattern.base': 'donation_token must be a valid contract address',
      'any.required': 'donation_token is required',
    }),
});

export function validateCampaignInput(input: any) {
  return campaignSchema.validate(input, { abortEarly: false });
}
