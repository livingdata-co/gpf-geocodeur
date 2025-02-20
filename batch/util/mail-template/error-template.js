import {template} from 'lodash-es'

const bodyTemplate = template(`
  <!DOCTYPE html>
  <html lang="fr">

  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre géocodage est en erreur</title>
    <style>
      body {
        background-color: #F5F6F7;
        color: #234361;
        font-family: "SF UI Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        margin: auto;
        padding: 25px;
      }

      h1 {
        text-align: center;
      }

      img {
        max-height: 45px;
        background-color: #F5F6F7;
      }

      .title {
        align-items: center;
        border-bottom: 1px solid #E4E7EB;
        justify-content: center;
        margin-top: 35px;
        min-height: 5em;
        padding: 10px;
        text-align: center;
      }
    </style>
  </head>

  <body>
    <h1>Géoplateforme IGN</h1>
    <div class="title">
      <h3 style="margin:0; mso-line-height-rule:exactly;">Une erreur est survenue pendant le géocodage de votre projet</h3>
    </div>

    <br />

    <p>
      Un problème est survenu lors du traitement de votre projet :
    </p>
    <pre> <%= error %> </pre>

    <p><b><i>L'équipe IGN</i></b></p>
  </body>

  </html>
`)

export function formatErrorEmail(data) {
  const {error} = data

  return {
    subject: 'Votre géocodage a échoué',
    html: bodyTemplate({error})
  }
}
