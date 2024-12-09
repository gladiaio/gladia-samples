# JavaScript

First, install all the required packages by running:

```bash
npm install
```

## Pre-recorded

Documentation can be found [here](https://docs.gladia.io/api-reference/pre-recorded-flow)

### run

You can run an example with a pre-recorded file on disk:

```bash
npm run pre-recorded-file <your_gladia_key>
```

To run with a url pointing to an audio or video file:

```bash
npm run pre-recorded-url <your_gladia_key>
```

## Live - Basic

Documentation can be found [here](https://docs.gladia.io/api-reference/live-flow)

### run

To run a live example simulating a session with an audio file, you have to run:

```bash
npm run live-file <your_gladia_key>
```

Or from microphone (it requires [arecord](https://www.thegeekdiary.com/arecord-command-not-found/) on Linux and [SoX](https://formulae.brew.sh/formula/sox) on MacOS):

```bash
npm run live-microphone <your_gladia_key>
```

Note: You can get your Gladia key from https://app.gladia.io.

When running the file example you should get an output like this one:

```bash
00:01.124 --> 00:04.588 | Hola Sasha, ¿qué tal? Hace mucho tiempo que no nos vemos. ¿Cómo vas?
00:05.128 --> 00:10.707 | Hola, ¿qué tal? Yo estoy muy bien. ¿Qué tal estás tú? Yo muy bien. ¿Qué has hecho ayer?
00:11.788 --> 00:18.836 | Pues ayer estuve trabajando todo el día, desde que tengo el trabajo nuevo no paro, tengo muchas cosas que hacer y a veces pienso que no me da tiempo.
00:19.599 --> 00:28.635 | ¿Qué lío? ¿Y qué estás haciendo exactamente? Trabajo... de periodista en una compañía española para el diario AS.
00:29.240 --> 00:38.596 | Как долго ты работаешь на этой работе? Ну, устроилась недавно, но работа очень нравится, я чувствую прекрасно, делаю то, что мне нравится.
00:39.700 --> 00:52.164 | И ты не скучаешь по России? Нет. Мне очень нравится. Здесь жить, и мне очень нравится климат, люди, всё прекрасно, место прекрасное.
00:53.924 --> 00:57.644 | And where do you see yourself in the future, like five years from now?
00:58.120 --> 01:06.384 | Well, I would like to start off my new company and start building a new startup that I have in mind, but that's still some ideas that I have.
01:08.588 --> 01:22.691 | Et finalement, il faut qu'on parle en français. Donc je sais que tu ne parles pas français mais tu peux quand même dire un mot pour finir la conversation. Oui merci, oui.
```

## Live - With error handling and automatic reconnection mechanism

Documentation can be found [here](https://docs.gladia.io/api-reference/live-flow)

### run

To run a live example simulating a session with an audio file, you have to run:

```bash
npm run live-file-with-resume <your_gladia_key>
```

Or from microphone (it requires [arecord](https://www.thegeekdiary.com/arecord-command-not-found/) on Linux and [SoX](https://formulae.brew.sh/formula/sox) on MacOS):

```bash
npm run live-microphone-with-resume <your_gladia_key>
```
