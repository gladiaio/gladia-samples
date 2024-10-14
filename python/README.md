# Python

First, install all the required package by running:

```bash
pip install -r requirements.txt
```

Then, change your gladia keys in `pre-recorded/transcription.py` or `streaming/live.py` depending on which one you're trying to run.

## Pre-recorded

Documentation can be found here:

https://docs.gladia.io/api-reference/pre-recorded-flow

### run

You can run a live example by running :

```bash
cd pre-recorded && python transcription.py
```

## Live

Documentation can be found here:

https://docs.gladia.io/api-reference/live-flow

### run

To run a streaming example you have to first install the dependencies located in `src/requirements.txt`. You can use a virtual environment for this.

Then run the following python file:

```bash
python src/streaming/live-from-file.py <gladia_key>
```

Note: You can get your Gladia key by following the [documentation](https://docs.gladia.io/chapters/get-started/pages/configure-account)

When running this example you should get an output like this one:

```
################ Begin session ################

00:00:01.124 --> 00:00:04.588 | Hola Sasha, ¿qué tal? Hace mucho tiempo que no nos vemos. ¿Cómo vas?
00:00:05.128 --> 00:00:10.707 | Hola, ¿qué tal? Yo estoy muy bien. ¿Qué tal estás tú? Yo muy bien. ¿Qué has hecho ayer?
00:00:11.788 --> 00:00:18.836 | Pues ayer estuve trabajando todo el día, desde que tengo el trabajo nuevo no paro, tengo muchas cosas que hacer y a veces pienso que no me da tiempo.
00:00:19.599 --> 00:00:28.635 | ¿Qué lío? ¿Y qué estás haciendo exactamente? Trabajo... de periodista en una compañía española para el diario AS.
00:00:29.240 --> 00:00:38.596 | Как долго ты работаешь на этой работе? Ну, устроилась недавно, но работа очень нравится, я чувствую прекрасно, делаю то, что мне нравится.
00:00:39.700 --> 00:00:52.164 | И ты не скучаешь по России? Нет. Мне очень нравится. Здесь жить, и мне очень нравится климат, люди, всё прекрасно, место прекрасное.
00:00:53.924 --> 00:00:57.740 | And where do you see yourself in the future, like five years from now?
00:00:58.120 --> 00:01:06.384 | Well, I would like to start off my new company and start building a new startup that I have in mind, but that's still some ideas that I have.
00:01:08.592 --> 00:01:22.691 | Et finalement, il faut qu'on parle en français. Donc je sais que tu parles pas français mais tu peux quand même dire un mot pour finir la conversation. Oui merci, oui.

################ End of session ################
```

If you want to test it using your microphone, use:

```bash
python src/streaming/live-from-microphone.py <gladia_key>
```
