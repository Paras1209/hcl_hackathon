# Cloudinary Setup Guide

This application uses Cloudinary for document storage and retrieval. Follow these steps to configure it:

## 1. Create a Free Cloudinary Account

1. Go to [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up for a free account (25GB storage + 25GB bandwidth/month)
3. Verify your email address

## 2. Get Your Credentials

1. Log in to your Cloudinary dashboard
2. Go to the Dashboard (main page)
3. Find your credentials in the "Account Details" section:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## 3. Update Environment Variables

Edit `server/.env` and replace the placeholder values:

```env
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret
CLOUDINARY_FOLDER=onboardiq-documents
```

## 4. Test the Integration

Once configured, documents will be automatically uploaded to Cloudinary when applications are submitted.

### Verify Upload

1. Submit an application with documents through the frontend
2. Check your Cloudinary Media Library:
   - Go to https://cloudinary.com/console/media_library
   - Navigate to the `onboardiq-documents` folder
   - You should see uploaded documents organized by application ID

## 5. View Uploaded Documents

Documents are stored with the following structure:
```
onboardiq-documents/
  └── A2000001/
      ├── PAN_CARD_1234567890.txt
      ├── AADHAAR_CARD_1234567891.txt
      └── ELECTRICITY_BILL_1234567892.txt
```

## Fallback Behavior

If Cloudinary is not configured (credentials missing or invalid), the application will:
- Still process documents and extract text
- Store document content in the database
- **NOT** upload files to cloud storage
- Log warnings in the console

## Troubleshooting

### "Cloudinary is not configured" Error

- Check that all three environment variables are set
- Ensure values don't contain the placeholder text "your-"
- Restart the server after updating .env

### Upload Failures

- Verify your API credentials are correct
- Check your Cloudinary account quota (free tier limits)
- Check server logs for detailed error messages

### Can't See Documents in Media Library

- Ensure the folder name matches `CLOUDINARY_FOLDER` in .env
- Check that uploads completed successfully (no errors in logs)
- Refresh the Media Library page

## Security Notes

- Never commit `.env` file to version control
- Keep your API Secret confidential
- Use different credentials for development and production
- Consider enabling signed uploads in production

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Node.js SDK Guide](https://cloudinary.com/documentation/node_integration)
- [Upload API Reference](https://cloudinary.com/documentation/image_upload_api_reference)
