import {template} from 'lodash-es'

const bodyTemplate = template(`
  <!DOCTYPE html>
  <html lang="fr">

  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre géocodage est prêt</title>
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
      <h3 style="margin:0; mso-line-height-rule:exactly;">Votre géocodage est terminé !</h3>
    </div>

    <br />

    <p>
      Le géocodage de votre projet s'est terminé avec succès.
      <br/>
      Votre fichier <i><%= fileName %></i> a été traité en <i><%= durationWithMinutes %></i>.
    </p>

    <p><b><i>L'équipe IGN</i></b></p>
  </body>

  </html>
`)

export function formatSuccessEmail(data) {
  const {fileName, duration} = data

  const durationWithMinutes = duration === 1 ? '1 minute' : `${duration} minutes`

  return {
    subject: 'Votre géocodage est prêt',
    html: bodyTemplate({fileName, durationWithMinutes})
  }
}
