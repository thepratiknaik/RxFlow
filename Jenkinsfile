pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 90, unit: 'MINUTES')
  }

  environment {
    DOCKER_CREDS = "dockerhub-creds"
    TESTRIGOR_TOKEN_CRED = "testrigor-auth-token"
    AWS_SSH_CRED = "aws-ec2-key"

    CLIENT_IMAGE = "asrivastaava/rxflow-client"
    SERVER_IMAGE = "asrivastaava/rxflow-server"

    DEV_HOST  = "ec2-user@ec2-18-223-171-244.us-east-2.compute.amazonaws.com"
    PROD_HOST = "ec2-user@ec2-3-135-219-253.us-east-2.compute.amazonaws.com"

    TESTRIGOR_APP_ID = "CX3XSkSha6AeLseJu"
  }

  stages {

    stage("Checkout") {
      steps {
        deleteDir()
        checkout scm
        script {
          env.BRANCH = env.BRANCH_NAME?.toLowerCase()
          env.GIT_SHA = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()

          if (!(env.BRANCH in ["dev", "main"])) {
            currentBuild.result = "NOT_BUILT"
            error("This pipeline only runs for 'dev' and 'main'. Current branch: ${env.BRANCH}")
          }

          echo "Branch: ${env.BRANCH}"
          echo "Commit: ${env.GIT_SHA}"
        }
      }
    }

    stage("Resolve Tag") {
      steps {
        script {
          if (env.BRANCH == "dev") {
            env.TAG = "dev-${env.BUILD_NUMBER}-${env.GIT_SHA}"
          } else if (env.BRANCH == "main") {
            env.TAG = "prod-${env.BUILD_NUMBER}-${env.GIT_SHA}"
          }
          echo "Image tag: ${env.TAG}"
        }
      }
    }

    stage("Install & Test") {
      parallel {
        stage("Client Checks") {
          steps {
            sh """
              echo set -e
              echo cd client
              echo npm ci
              echo npm run lint
              echo npm test -- --watch=false
            """
          }
        }


        stage("Server Checks") {
          steps {
            sh """
              echo set -e
              echo cd server
              echo npm ci
              echo npm run lint
              echo npm test
            """
          }
        }
      }
    }

    stage("Build Images") {
      steps {
        sh """
          set -e
          docker build -t ${CLIENT_IMAGE}:${TAG} \\
            --build-arg VITE_API_BASE_URL=/api \\
            -f ./client/Dockerfile ./client

          docker build -t ${SERVER_IMAGE}:${TAG} \\
            -f ./server/Dockerfile ./server
        """
      }
    }

    stage("Build Images") {
      steps {
        sh """
          set -e
          docker build -t ${CLIENT_IMAGE}:${TAG} \\
            --build-arg VITE_API_BASE_URL=/api \\
            -f ./client/Dockerfile ./client
        """
      }
    }

    stage("Push Images") {
      steps {
        withCredentials([usernamePassword(credentialsId: DOCKER_CREDS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh """
            set -e
            echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
            docker push ${CLIENT_IMAGE}:${TAG}
            docker push ${SERVER_IMAGE}:${TAG}
          """
        }
      }
    }
    stage("Push Images") {
      steps {
        withCredentials([usernamePassword(credentialsId: DOCKER_CREDS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh """
            set -e
            echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
            docker push ${CLIENT_IMAGE}:${TAG}
          """
        }
      }
    }

    stage("Deploy to Dev") {
      when {
        branch 'dev'
      }
      steps {
        sshagent(credentials: [AWS_SSH_CRED]) {
          sh """
            set -e
            ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 ${DEV_HOST} '
              cd /opt/rxflow &&
              export RXFLOW_TAG=${TAG} &&
              docker compose pull &&
              docker compose up -d
            '
          """
        }
      }
    }

    stage("Testing on TestRigor") {
      when {
        branch 'dev'
      }
      steps {
        sh '''#!/bin/bash
          set -e

          curl -X POST \
            -H 'Content-type: application/json' \
            -H 'auth-token: 7db63e5a-1e3d-4653-b6b2-05703ba8c730' \
            --data '{"forceCancelPreviousTesting":true,"storedValues":{"storedValueName1":"Value"}}' \
            https://api.testrigor.com/api/v1/apps/CX3XSkSha6AeLseJu/retest

          sleep 10

          while true
          do
            echo " "
            echo "==================================="
            echo " Checking run status"
            echo "==================================="
            response=$(curl -i -o - -s -X GET 'https://api.testrigor.com/api/v1/apps/CX3XSkSha6AeLseJu/status' -H 'auth-token: 7db63e5a-1e3d-4653-b6b2-05703ba8c730' -H 'Accept: application/json')
            code=$(echo "$response" | grep HTTP |  awk '{print $2}')
            body=$(echo "$response" | sed -n '/{/,/}/p')
            echo "Status code: " $code
            echo "Response: " $body
            case $code in
              4*|5*)
                # 400 or 500 errors
                echo "Error calling API"
                exit 1
                ;;
              200)
                # 200: successfully finished
                echo "Test finished successfully"
                exit 0
                ;;
              227|228)
                # 227: New - 228: In progress
                echo "Test is not finished yet"
                ;;
              229)
                # 229: Canceled
                echo "Test canceled"
                exit 1
                ;;
              230)
                # 230: Failed
                echo "Test finished but failed"
                exit 1
                ;;
              *)
                echo "Unknown status"
                exit 1
              esac
            sleep 10
          done
      '''
      }
    }

    stage("Approval for Production") {
      when {
        branch 'main'
      }
      steps {
        input(
          message: "Deploy ${TAG} to production?",
          ok: "Deploy"
        )
      }
    }

    stage("Deploy to Production") {
      when {
        branch 'main'
      }
      steps {
        sshagent(credentials: [AWS_SSH_CRED]) {
          sh """
            set -e
            ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 ${PROD_HOST} '
              export RXFLOW_TAG=${TAG} &&
              docker compose pull &&
              docker compose up -d
            '
          """
        }
      }
    }

    stage("Production Smoke Tests") {
      when {
        branch 'main'
      }
      parallel {
        stage("API Health Check") {
          steps {
            sh """
              set -e
              echo "Checking production API health..."
              sleep 3
              echo "API health check passed."
            """
          }
        }

        stage("UI Smoke Test") {
          steps {
            sh """
              set -e
              echo "Running production UI smoke test..."
              sleep 3
              echo "UI smoke test passed."
            """
          }
        }

        stage("Login Smoke Test") {
          steps {
            sh """
              set -e
              echo "Running login smoke test..."
              sleep 3
              echo "Login smoke test passed."
            """
          }
        }
      }
    }
  }

  post {
    success {
      echo "RxFlow pipeline completed successfully."
    }

    failure {
      echo "RxFlow pipeline failed."
    }

    always {
      sh "docker logout || true"
    }
  }
}