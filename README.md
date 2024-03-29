# Marina REST API

## Table of Contents
- [Overview](#overview "Overview")
- [Usage](#usage "Usage")
  - [API Specifications](#specs "API Specifications")
  - [Examples](#examples "Examples")
- [Testing](#testing "Testing")

## Overview <a name="overview"></a>
This project is a REST API service that models a simple marina with three resources: users, boats, and loads. These resources can be manipulated through various CRUD operations. The application is written in JavaScript, HTML, and CSS using NodeJS and Express. It is deployed through Google Cloud Platform's App Engine with Google Datastore as the NoSQL database and uses Okta’s Auth0 for user authentication.

## Usage <a name="usage"></a>
Here are the links required to use this cloud API:
- API URL: [https://kp-marina-api.uw.r.appspot.com](https://kp-marina-api.uw.r.appspot.com "API URL")
- Account creation and login: [https://kp-marina-api.uw.r.appspot.com](https://kp-marina-api.uw.r.appspot.com "Account creation and login")

While many resources and features are publicly available, an account is needed to fully utilize the API. To create an account:
1. Go to the [account creation and login page](https://kp-marina-api.uw.r.appspot.com "Account creation and login").
2. Click on the _Login/Create Account_ button.
3. Click _Sign Up_ on the Auth0 page.
4. Create an account using an email and password.
5. Save the Unique ID and JSON Web Token (JWT) displayed on the landing page for later. They can be accessed any time by simply logging in again.

The Unique ID is only necessary for testing purposes, such as those described in the [Testing section](#testing "Testing").
<br>When authentication is required for a particular request, the JWT associated with the respective user should be attached to the request as an authorization header, like so: `Authorization: Bearer <jwt>`. The [API Specifications section](#specs "API Specifications") covers when authentication is required.

### API Specifications <a name="specs"></a>
[This document details the API specifications](API-specifications.pdf "API-specifications.pdf"), providing requirements and examples for:
- Resource entities (data model)
- Supported request methods
- Request path parameters, headers, and bodies
- Response types, bodies, and status codes
- Successful and failed responses

### Examples <a name="examples"></a>
The following are excerpts from the [API specifications document](API-specifications.pdf "API-specifications.pdf") described previously.

**Example of Boat Data Model**
![Screenshot of table describing the data types and requirements for boat entities](https://github.com/realKP/marina-API/assets/76978772/699d5036-416b-4c93-be40-85a20e4549ac)

**Example of Boat POST Request Body**
![Screenshot of JSON request body to create a boat entity](https://github.com/realKP/marina-API/assets/76978772/2dd6054d-93c4-4b81-b7ec-4e7a603e9f94)

**Example of Response Statuses for Boat POST Request**
![Screenshot of possible response statuses for creating a boat entity](https://github.com/realKP/marina-API/assets/76978772/e8e33e4b-9a57-4040-ae50-3609bf06dab6)

**Examples of Responses for Boat POST Request**
![Screenshot of successful and unsuccessful responses for creating a boat entity](https://github.com/realKP/marina-API/assets/76978772/0f1be8ce-e45e-46b4-9f5e-f9a5f3e65161)

## Testing <a name="testing"></a>
This project was created through test-driven development (TDD) using the API platform [Postman](https://www.postman.com/). The [testing collection](testing/marina-rest-api.postman_collection.json "marina-rest-api.postman_collection.json") contains over 60 requests with each request containing multiple unit tests.

For example, the following demonstrates the GET request and respective tests for the information on a particular load:
![Screenshot of a GET load request path and respective tests](https://github.com/realKP/marina-API/assets/76978772/5fc0aea3-e33e-438c-9502-36e9b1d0a909)

To run this test collection successfully yourself, you must use the [Postman environment](testing/marina-rest-api.postman_environment.json "marina-rest-api.postman_environment.json") containing the necessary variables. The only modifications that need to be made are to replace the values of variables `user_id1` and `user_id2` with the unique ID's of two user accounts that you have created (covered in the [Usage section](#usage "Usage")) as well as their corresponding JWT's for the values of variables `jwt1` and `jwt2`. This is shown below:

![Screenshot of Postman environment variables](https://github.com/realKP/marina-API/assets/76978772/cde41bf9-b44f-4591-a660-83ec60a524d3)
