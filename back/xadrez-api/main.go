package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func getMainRoute(c *gin.Context) {
	dynamicObject := make(map[string]interface{})
	dynamicObject["example"] = "Exemplo"

	c.IndentedJSON(http.StatusOK, dynamicObject)
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Couldn't load .env file")
	}

	api_addr := os.Getenv("API_ADDRESS")
	if api_addr == "" {
		log.Fatal("Variable API_ADDRESS not set in .env file")
	}

	router := gin.Default()
	router.GET("/", getMainRoute)

	router.Run(api_addr)
}
