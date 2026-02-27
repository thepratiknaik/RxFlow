pipeline {
  agent any

  environment {
    DOCKER_CREDS = "dockerhub-creds"
    CLIENT_IMAGE = "asrivastaava/rxflow-client"
    SERVER_IMAGE = "asrivastaava/rxflow-server"
  }

  stages {
    stage("Checkout") {
      steps {
        deleteDir()
        checkout scm
      }
    }

    stage("Decide Tag") {
      steps {
        script {
          def b = env.BRANCH_NAME?.toLowerCase()
          if (b == "dev") {
            env.TAG = "dev-latest"
          } else if (b == "main") {
            env.TAG = "latest"
          } else {
            error("Branch not allowed: ${b}")
          }
          echo "Branch=${b}, TAG=${env.TAG}"
        }
      }
    }

    stage("Build Images") {
      steps {
        sh """
          docker build -t ${CLIENT_IMAGE}:${TAG} \
            --build-arg REACT_APP_API_URL=/api \
            -f ./client/Dockerfile ./client

          docker build -t ${SERVER_IMAGE}:${TAG} \
            -f ./server/Dockerfile ./server
        """
      }
    }

    stage("Push Images") {
      steps {
        withCredentials([usernamePassword(credentialsId: DOCKER_CREDS, usernameVariable: 'U', passwordVariable: 'P')]) {
          sh """
            echo "$P" | docker login -u "$U" --password-stdin
            docker push ${CLIENT_IMAGE}:${TAG}
            docker push ${SERVER_IMAGE}:${TAG}
          """
        }
      }
    }
  }

  post {
    always {
      sh "docker logout || true"
    }
  }
}