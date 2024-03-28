# How to Use Gladia's Subtitles API

Gladia's Subtitles API allows you to automatically generate subtitles for your videos in various languages. The API is easy to use and offers a free tier with 10 hours per month. This guide will walk you through the steps to access and use this API.

## Step 1: Obtaining Your API Key

Before you can start using the Subtitles API, you need an API key. Here's how you can get it:

1. Go to [Gladia's Application Portal](https://app.gladia.io).
2. Sign up for an account if you don't already have one.
3. Once logged in, navigate to the API section.
4. Look for the Subtitles API and subscribe to it.
5. You will be given an API key, which you can use for your requests.

   Note: The free tier allows for 10 hours of usage per month. If you need more, there are paid plans available.

## Step 2: Using the Subtitles API

The Subtitles API endpoint is structured as follows:

```
https://subtitles.gladia.io/subtitles-3.html
```

You can customize the API call by adding parameters such as your API token, source language, and visual customization options for the subtitles.

Here's an example of a URL constructed with various parameters:

```
https://subtitles.gladia.io/subtitles-3.html?token=YOUR_API_KEY&source_language=english&font_size=40&font_name=Comic%20Sans%20MS&background_color=00ff00&text_color=ffffff&endpoint=5
```

### Parameters:

- `token`: Your API key from Gladia.
- `source_language`: The language of the video you are creating subtitles for (e.g., "french").
- `target_language`: The language to which you want to translate the subtitles (e.g., "english").
- `font_size`: The size of the font for the subtitles in pixel.
- `font_name`: The font family for the subtitles (e.g., "Arial").
- `background_color`: The background color of the subtitles in hex format (e.g., "000000" for black).
- `text_color`: The color of the text for the subtitles in hex format (e.g., "ffffff" for white).
- `endpointing`: The endpointing duration in seconds. (Specifies the endpointing duration in milliseconds. i.e. the duration of silence which will cause the utterance to be considered finished and a result of type ‘final’ to be sent.) (recommended 5 for 5ms for conferences)
- `max_lines`: The maximum number of lines for subtitles.
- `line_height`: The line height for subtitles.
- `scroll_speed`: The speed at which the subtitles scroll in milliseconds per pixel.
- `alignment`: The alignment of the subtitles. (left, right, justify, start, end)
- `model`: The model used for generating subtitles. (fast or accurate)
- `vocab`: A list of vocabulary or keywords to be highlighted in the subtitles. (a comma separated value of custom vocabulary)

You can provide descriptions and usage examples for each of these parameters in your API documentation.

## Step 3: Making the API Call

Once you have your URL with all parameters set, you can use it in your application to make the API call. If you're using this in a web application, you can simply make a GET request to the constructed URL.

## Step 4: Receiving and Using the Subtitles

After making the API call, you will receive the subtitles, which you can then use in your video player or download as a file, depending on your requirements and the setup of your application.

## Additional Notes

- Make sure to keep your API key secret.
- Be mindful of the usage limits on the free tier.
- Check Gladia's documentation for any updates or changes to the API endpoints or parameters.

---

Remember to replace `YOUR_API_KEY` with the actual API key you received from Gladia. By following these instructions, you should be able to utilize the Subtitles API to automatically generate subtitles for your video content.
