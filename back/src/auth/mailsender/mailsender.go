package mailsender

import (
	"bytes"
	"errors"
	"net/smtp"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"text/template"
)

type EmailSender struct {
	templates map[string]*template.Template
	smtpAuth  smtp.Auth
	address   string
	email     string
	name      string
}

func NewEmailSender(username string, password string, host string, port int, name string, templateDir string) (*EmailSender, error) {
	emailSender := EmailSender{
		smtpAuth:  smtp.PlainAuth("", username, password, host),
		address:   host + ":" + strconv.Itoa(port),
		email:     username,
		name:      name,
		templates: make(map[string]*template.Template),
	}

	files, err := os.ReadDir(templateDir)
	if err != nil {
		return nil, err
	}

	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".html") {
			continue
		}

		template, err := template.ParseFiles(filepath.Join(templateDir, file.Name()))
		if err != nil {
			return nil, err
		}

		name, _ := strings.CutSuffix(file.Name(), ".html")
		emailSender.templates[name] = template
	}

	return &emailSender, nil
}

func (sender *EmailSender) SendEmail(to string, subject string, templateName string, parameters map[string]string) error {

	htmlContent, err := sender.parseTemplate(templateName, parameters)
	if err != nil {
		return err
	}

	message := "From: " + sender.name + " <" + sender.email + ">\r\n"
	message += "To: " + to + "\r\n"
	message += "Subject: " + subject + "\r\n"
	message += "MIME-Version: 1.0\r\n"
	message += "Content-Type: text/html; charset=\"UTF-8\"\r\n"
	message += "\r\n"

	message += htmlContent + "\r\n"

	return smtp.SendMail(
		sender.address,
		sender.smtpAuth,
		sender.email,
		[]string{to},
		[]byte(message),
	)
}

func (sender *EmailSender) parseTemplate(templateName string, parameters map[string]string) (string, error) {
	template, exists := sender.templates[templateName]
	if !exists {
		return "", errors.New("Template " + templateName + " not found")
	}

	var buf bytes.Buffer
	err := template.Execute(&buf, parameters)
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}
