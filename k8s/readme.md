## Check logs

```
kubectl logs -l app=backend -n bookingapp -f
```

## Watch pods status

```
kubectl get pods -n bookingapp -w
```

## Apply

```
kubectl apply -k k8s/ 
```

## Delete
```
kubectl delete -k k8s/ 
```


## Restart
```
kubectl rollout restart deployment backend -n bookingapp
```


## Login to mongo
kubectl exec -it mongodb-0 -n bookingapp -- mongosh -u root -p example --authenticationDatabase admin --eval "db.runCommand({ ping: 1 })"


## List pods
```
kubectl get pods -n bookingapp -l app=backend
```

## Shell access
```
kubectl exec -it backend-7d9f8c5b6-abcde -n bookingapp -- /bin/sh
```

## Delete by keeping data
```
kubectl delete all --all -n bookingapp
```