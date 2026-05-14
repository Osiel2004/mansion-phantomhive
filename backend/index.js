const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

// Inicializamos la conexión con DynamoDB
const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

// El nombre exacto de la tabla que creamos con Terraform
const tableName = "Phantomhive_Catalogo";

exports.handler = async (event) => {
  let body;
  let statusCode = 200;
  
  // Estos "headers" son obligatorios para que React (CORS) nos permita leer la respuesta
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
  };

  try {
    // Revisamos qué tipo de petición nos hace React
    switch (event.httpMethod) {
      case "GET":
        // Si es GET, leemos toda la tabla para mostrar el catálogo
        const scanResult = await dynamo.send(new ScanCommand({ TableName: tableName }));
        body = scanResult.Items;
        break;
        
      case "POST":
        // Si es POST, viene desde nuestro futuro panel de administrador para agregar un producto
        let requestJSON = JSON.parse(event.body);
        await dynamo.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              id: requestJSON.id.toString(), // DynamoDB requiere que el ID sea texto según nuestro Terraform
              nombre: requestJSON.nombre,
              precio: Number(requestJSON.precio),
              categoria: requestJSON.categoria,
              stock: Number(requestJSON.stock),
              imagen: requestJSON.imagen || ""
            },
          })
        );
        body = { mensaje: `Producto ${requestJSON.nombre} agregado exitosamente a la mansión` };
        break;
        
      default:
        throw new Error(`Método HTTP no soportado: "${event.httpMethod}"`);
    }
  } catch (err) {
    statusCode = 400;
    body = { error: err.message };
  } finally {
    // Convertimos la respuesta a texto plano (JSON) para enviarla por internet
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};