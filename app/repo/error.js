'use strict';


class ErrorMixin extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = this.constructor.name;
        Error.captureStackTrace(this);
    }
    toJSON() {
        return {message: this.message, name: this.name, stacktrace: this.stack};
    }
}


class AttributeError extends ErrorMixin {}


class ParsingError extends ErrorMixin {}


class ControlledVocabularyError extends ErrorMixin {}


class NoResultFoundError extends ErrorMixin {}


class PermissionError extends ErrorMixin {}


class AuthenticationError extends ErrorMixin {}


class MultipleResultsFoundError extends ErrorMixin {}


module.exports = {
    ErrorMixin, AttributeError, ParsingError, ControlledVocabularyError, NoResultFoundError, MultipleResultsFoundError, PermissionError, AuthenticationError
};
